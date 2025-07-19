<?php
/*
 * Copyright (c) 2012-2016, Hofmänner New Media.
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This file is part of the N2N FRAMEWORK.
 *
 * The N2N FRAMEWORK is free software: you can redistribute it and/or modify it under the terms of
 * the GNU Lesser General Public License as published by the Free Software Foundation, either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * N2N is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even
 * the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Lesser General Public License for more details: http://www.gnu.org/licenses/
 *
 * The following people participated in this project:
 *
 * Andreas von Burg.....: Architect, Lead Developer
 * Bert Hofmänner.......: Idea, Frontend UI, Community Leader, Marketing
 * Thomas Günther.......: Developer, Hangar
 */
namespace n2n\impl\web\ui\view\html\img;

use n2n\io\managed\File;
use n2n\core\container\N2nContext;
use n2n\io\managed\img\ImageFile;
use n2n\io\managed\img\impl\ProportionalThumbStrategy;
use n2n\io\managed\img\ImageMimeType;

class ProportionalImgComposer implements ImgComposer {
	protected $width;
	protected $height;
	protected $autoCropMode;
	protected $scaleUpAllowed;

	protected $fixedWidths;
	protected $maxWidth;
	protected $minWidth;

	protected ?string $sizesAttr = null;
	protected array $sizesBpWidthMap = [];

	/**
	 * @param int $width
	 * @param int $height
	 * @param string $autoCropMode
	 * @param bool $scaleUpAllowed
	 */
	public function __construct(int $width, int $height, ?string $autoCropMode = null, bool $scaleUpAllowed = true,
			private ?ImageMimeType $imageMimeType = null) {
		$this->maxWidth = $this->minWidth = $this->width = $width;
		$this->height = $height;
		$this->autoCropMode = $autoCropMode;
		$this->scaleUpAllowed = $scaleUpAllowed;
	}

	/**
	 * @param int $width
	 * @return ProportionalImgComposer
	 */
	public function toWidth(int $width) {
		if ($width > $this->maxWidth) {
			$this->maxWidth = $width;
			return $this;
		}

		if ($width < $this->minWidth) {
			$this->minWidth = $width;
			return $this;
		}

		return $this;
	}

	/**
	 * @param int ...$widths
	 * @return \n2n\impl\web\ui\view\html\img\ProportionalImgComposer
	 */
	public function widths(int ...$widths) {
		foreach ($widths as $width) {
			$this->fixedWidths[$width] = $width;
		}
		return $this;
	}

	/**
	 * @param float ...$factors
	 * @return \n2n\impl\web\ui\view\html\img\ProportionalImgComposer
	 */
	public function factors(float ...$factors) {
		foreach ($factors as $factor) {
			$width = (int) ceil($this->width * $factor);
			$this->fixedWidths[$width] = $width;
		}
		return $this;
	}

	/**
	 * @return int
	 */
	public function getWidth() {
		return $this->width;
	}

	/**
	 * @return int[]
	 */
	public function getWidths() {
		$widths = $this->fixedWidths;
		$widths[$this->minWidth] = $this->minWidth;
		$widths[$this->width] = $this->width;
		$widths[$this->maxWidth] = $this->maxWidth;
		krsort($widths, SORT_NUMERIC);
		return $widths;
	}

	/**
	 * @return \n2n\impl\web\ui\view\html\img\ImgSet
	 */
	private function createPlaceholderImgSet() {
		$widths = $this->getWidths();
		$largestWidth = reset($widths);
		$largestHeight = $this->calcHeight($largestWidth);

		return new ImgSet(UiComponentFactory::createInvalidImgSrc($largestWidth, $largestHeight),
				UiComponentFactory::INVALID_IMG_DEFAULT_ALT, $largestWidth, $largestHeight, array());
	}

	/**
	 * {@inheritDoc}
	 * @see \n2n\impl\web\ui\view\html\img\ImgComposer::createImgSet()
	 */
	public function createImgSet(?File $file, N2nContext $n2nContext): ImgSet {
		if ($file === null || !$file->isValid()) {
			return $this->createPlaceholderImgSet();
		}

		$orgImageFile = new ImageFile($file);

		$thumbFile = null;
		$imageFiles = array();
		foreach ($this->getWidths() as $width) {
			if ($thumbFile === null) {
				$imageFiles[$width] = $thumbFile = $this->createThumb($orgImageFile, $width);
				continue;
			}

			if (null !== ($imageFile = $this->buildVariation($thumbFile, $width, $orgImageFile))) {
				$imageFiles[$width] = $imageFile;
			}
		}

// 		$lastSize = null;
// 		$lastWidth = null;
// 		foreach ($imageFiles as $width => $imageFile) {
// 			if ($width > $this->maxWidth || $width < $this->minWidth) continue;

// 			// 			$size = $imageFile->getFile()->getFileSource()->getSize();
// 			// 			if (!$this->isSizeGabTooLarge($lastWidth, $lastWidth = $size)) continue;

// 			// 			if ($lastSize > $size) {

// 			// 			}
// 		}

		$imgSrcs = array();
		foreach ($imageFiles as $width => $imageFile) {
			$imgSrcs[$width . 'w'] = UiComponentFactory::createImgSrc($imageFile);
		}

		$defaultImageFile = reset($imageFiles);

		$imageSourceSets = array();
		$sizesAttr = $this->getSizesAttr();
		$mediaAttr = $this->getMediaAttr();
		if (count($imgSrcs) > 1 || $sizesAttr !== null || $mediaAttr !== null) {
			$imageSourceSets = array(new ImageSourceSet(array_reverse($imgSrcs, true), $mediaAttr, ['sizes' => $sizesAttr],
					$defaultImageFile->getWidth(), $defaultImageFile->getHeight()));
		}

		return new ImgSet(reset($imgSrcs), '', $defaultImageFile->getWidth(),
				$defaultImageFile->getHeight(), $imageSourceSets);
	}

	const MIN_SIZE_GAB = 51200;

	/**
	 * @param int $largerSize
	 * @param int $size
	 * @return boolean
	 */
	private function isSizeGabTooLarge($largerSize, $size) {
		$diff = $largerSize - $size;
		if ($diff <= self::MIN_SIZE_GAB) return false;

		return ($largerSize / 3 < $diff);
	}

	/**
	 * @param int $largerWidth
	 * @param int $width
	 * @return number|NULL
	 */
	private function calcGabWidth($largerWidth, $width) {
		$diff = $largerWidth - $width;

		if ($diff > $largerWidth * 0.75) {
			return $largerWidth - (int) ceil($diff / 2);
		}

		return null;
	}

	/**
	 * @param int $width
	 * @return number
	 */
	private function calcHeight($width) {
		return ceil($this->height / $this->width * $width);
	}

	/**
	 * @param int $width
	 * @return \n2n\io\managed\img\impl\ProportionalThumbStrategy
	 */
	private function createStrategy($width) {
		$height = $this->calcHeight($width);

		return new ProportionalThumbStrategy($width, $height, $this->autoCropMode, $this->scaleUpAllowed, null,
				$this->imageMimeType);
	}

	/**
	 * @param ImageFile $imageFile
	 * @param int $width
	 * @return \n2n\io\managed\img\ImageFile
	 */
	private function createThumb(ImageFile $imageFile, int $width) {
		return $imageFile->getOrCreateThumb($this->createStrategy($width));
	}

	/**
	 * @param ImageFile $imageFile
	 * @param int $width
	 * @param ImageFile $orgImageFile
	 * @return NULL|\n2n\io\managed\img\ImageFile
	 */
	private function buildVariation(ImageFile $imageFile, int $width, ?ImageFile $orgImageFile = null) {
		$strategy = $this->createStrategy($width);
		if ($strategy->matches($imageFile->getImageSource())) {
			return null;
		}

		$orgImageSource = null;
		if ($orgImageFile !== null) {
			$orgImageSource = $orgImageFile->getImageSource();
		}

		return $imageFile->getOrCreateVariation($strategy, $orgImageSource);
	}

	/**
	 * @param string $sizesAttr
	 * @return \n2n\impl\web\ui\view\html\img\ProportionalImgComposer
	 */
	public function sizes(string $sizesAttr) {
		$this->sizesAttr = $sizesAttr;
		return $this;
	}

	private function getMediaAttr(): ?string {
		if (empty($this->sizesBpWidthMap)) {
			return null;
		}

		$mediaMinWith = min(...array_keys($this->sizesBpWidthMap));
		if ($mediaMinWith === 0) {
			return null;
		}

		return '(min-width: ' . $mediaMinWith . 'px)';
	}


	private function getSizesAttr(): ?string {
		if ($this->sizesAttr === null && empty($this->sizesBpWidthMap)) {
			return null;
		}

		$sizesAttr = $this->sizesAttr;
		foreach ($this->sizesBpWidthMap as $bpWidth => $width) {
			if ($bpWidth === 0) {
				$sizesAttr .= ' ' . $width. 'px';
			} else {
				$sizesAttr .= ' (min-width: ' . $bpWidth . 'px) ' . $width. 'px';
			}
		}
		return trim($sizesAttr);
	}

	function mediaBaseSize(int $width): static {
		$this->mediaBpSize(0, $width);
		return $this;
	}

	function mediaBpSize(int $breakpointWidth, int $width): static {
		$this->sizesBpWidthMap[$breakpointWidth] = $width;
		return $this;
	}

	/**
	 * @return \n2n\impl\web\ui\view\html\img\ProportionalImgComposer
	 */
	public function copy() {
		$pic = new ProportionalImgComposer($this->width, $this->height, $this->autoCropMode, $this->scaleUpAllowed,
				$this->imageMimeType);
		$pic->fixedWidths = $this->fixedWidths;
		$pic->maxWidth = $this->maxWidth;
		$pic->minWidth = $this->minWidth;

		$pic->sizesAttr = $this->sizesAttr;
		$pic->sizesBpWidthMap = $this->sizesBpWidthMap;
		return $pic;
	}
}

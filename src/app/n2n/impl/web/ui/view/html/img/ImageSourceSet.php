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

class ImageSourceSet {
	private $imgSrcs;
	private $mediaAttr;
	private $attrs;
	private $widthAttr;
	private $heightAttr;

	public function __construct(array $imgSrcs, string $mediaAttr = null, array $attrs = null,
			string $widthAttr = null, string $heightAttr = null) {
		$this->imgSrcs = $imgSrcs;
		$this->mediaAttr = $mediaAttr;
		$this->attrs = (array) $attrs;
		$this->widthAttr = $widthAttr;
		$this->heightAttr = $heightAttr;
	}
	
	public function getMediaAttr() {
		return $this->mediaAttr;
	}
	
	public function setMediaAttr(string $mediaAttr) {
		$this->mediaAttr = $mediaAttr;
	}
	
	public function getImgSrcs() {
		return $this->imgSrcs;
	}
	
	public function getSrcsetAttr() {
		$attrs = array();
		foreach ($this->imgSrcs as $htmlLength => $imgSrc) {
			$attrs[] = $imgSrc . ' ' . $htmlLength;
		}
		return implode(', ', $attrs);
	}

	public function getAttrs() {
		return $this->attrs;
	}
	
	public function getWidthAttr() {
		return $this->widthAttr;
	}
	
	public function getHeightAttr() {
		return $this->heightAttr;
	}
}

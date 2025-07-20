<?php

namespace n2n\impl\web\ui\view\html\img;

use n2n\util\type\ArgUtils;
use n2n\io\managed\File;
use n2n\core\container\N2nContext;

class MultiDimensionalImgComposer implements ImgComposer {

	private ProportionalImgComposer $baseImgComposer;

	/**
	 * @param ImgComposer[] $imgComposers
	 */
	public function __construct(private array $imgComposers) {
		ArgUtils::assertTrue(!empty($imgComposers), 'Empty ImgComposer array passed.');
		ArgUtils::valArray($imgComposers, ImgComposer::class);

	}

	/**
	 * {@inheritDoc}
	 * @see \n2n\impl\web\ui\view\html\img\ImgComposer::createImgSet()
	 */
	public function createImgSet(?File $file, N2nContext $n2nContext): ImgSet {
		$imgSets = array();

		foreach (array_reverse($this->imgComposers) as $bpImageComposer) {
			$imgSets[] = $bpImageComposer->createImgSet($file, $n2nContext);
		}

		$defImgSet = array_shift($imgSets);
		foreach ($imgSets as $imgSet) {
			$this->combineImgSet($defImgSet, $imgSet);
		}
		return $defImgSet;
	}

	private function combineImgSet(ImgSet $imgSet, ImgSet $imgSet2) {
		foreach ($imgSet2->getImageSourceSets() as $imageSourceSet) {
			$imgageSourceSets = $imgSet->getImageSourceSets();
			array_unshift($imgageSourceSets, $imageSourceSet);
			$imgSet->setImageSourceSets($imgageSourceSets);
		}

		if ($imgSet->getDefaultWidthAttr() < $imgSet2->getDefaultWidthAttr()) {
			$imgSet->setDefaultSrcAttr($imgSet2->getDefaultSrcAttr());
			$imgSet->setDefaultAltAttr($imgSet2->getDefaultAltAttr());
			$imgSet->setDefaultWidthAttr($imgSet2->getDefaultWidthAttr());
			$imgSet->setDefaultHeightAttr($imgSet2->getDefaultHeightAttr());
		}
	}

}
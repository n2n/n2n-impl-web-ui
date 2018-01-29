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
namespace n2n\impl\web\ui\view\html;

use n2n\web\ui\UiComponent;
use n2n\web\ui\UiException;
use n2n\util\HashUtils;
use n2n\reflection\ReflectionUtils;
use n2n\web\ui\BuildContext;
use n2n\web\ui\SimpleBuildContext;

class HtmlUtils {
	public static function validateCustomAttrs(array $customAttrs, array $reservedAttrNames) {
		foreach ($customAttrs as $name => $value) {
			if (in_array($name, $reservedAttrNames)) {
				throw new AttributeNameIsReservedException('Attribute is reserved: ' . $name 
						. ' All reserved attributes: ' . implode(', ', $reservedAttrNames));
			}
		}
	}
	
	public static function mergeAttrs(array $attrs, array $customAttrs = null, bool $overwrite = false) {
		if ($customAttrs === null) return $attrs;
		
		foreach ($customAttrs as $name => $value) {
			if (is_numeric($name)) {
				if (in_array($value, $attrs)) continue;
			} else if (isset($attrs[$name])) {
				if ($name == 'class') {
					$attrs['class'] .= ' ' . $value;
					continue;
				} else if (!$overwrite) {
					throw new AttributeNameIsReservedException('Html attribute \'' . $name . '\' is reserved.'
							. ' Reserved attributes: ' . implode(', ', array_keys($attrs)));
				}
			}
			
			$attrs[$name] = $value;
		}
		
		return $attrs;
	}
	
	public static function contentsToHtml($contents, BuildContext $buildContext) {
		if ($contents instanceof UiComponent) {
			return $contents->build($buildContext);
		}
		
		if (is_object($contents) && !method_exists($contents, '__toString')) {
			$contents = ReflectionUtils::getTypeInfo($contents);
		}
		
		return htmlspecialchars((string) $contents);
	}
	
	public static function escape($contents, \Closure $pcf = null) {
		$html = null;
		
		if ($contents === null) {
			$html = '';
		} else if (is_scalar($contents)) {
			$html = htmlspecialchars((string) $contents);
		} else if ($contents instanceof UiComponent) {
			return htmlspecialchars($contents->build(new SimpleBuildContext()));
		} else if (is_object($contents) && method_exists($contents, '__toString')) {
			$html = htmlspecialchars((string) $contents);
		} else {
			throw new \InvalidArgumentException('Could not convert type to escaped string: ' 
					. ReflectionUtils::getTypeInfo($contents));
		}
		
		if (isset($pcf)) {
			$html = $pcf($html);
		}
		
		return $html;
	}
		
	public static function buildUniqueId($prefix = null) {
		return $prefix . HashUtils::base36Uniqid();
	}

	public static function encode($str) {
		$strHtml = (string) $str;
		
		for($i = "a"; $i <= "z"; $i++) {
			$strHtml = str_replace($i, "&#" . ord($i) . ";", $strHtml);
		}
		
		for($i = "A"; $i <= "Z"; $i++) {
			$strHtml = str_replace($i, "&#" . ord($i) . ";", $strHtml);
		}
		
		$strHtml = str_replace(".", "&#46;", $strHtml);
		$strHtml = str_replace("@", "&#64;", $strHtml);
		
		return $strHtml;
	}
	
	public static function encodedEmailUrl($email) {
		return HtmlUtils::encode('mailto:' . urlencode($email));
	}

	public static function stripHtml($content) {
		return strip_tags($content);
	}
}


class AttributeNameIsReservedException extends UiException {
	
}

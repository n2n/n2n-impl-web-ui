<?php

namespace n2n\impl\web\ui\view\jhtml;

use n2n\web\http\payload\BufferedPayload;
use n2n\web\http\Response;
use n2n\web\http\payload\impl\JsonPayload;
use n2n\util\ex\IllegalStateException;
use n2n\impl\web\ui\view\html\HtmlView;
use n2n\web\ui\SimpleBuildContext;
use n2n\impl\web\ui\view\html\HtmlBuilderMeta;
use n2n\web\ui\UiComponent;

class JhtmlJsonPayload extends BufferedPayload {
	const ATTR_HEAD_KEY = 'head';
	const ATTR_BODY_START_KEY = 'bodyStart';
	const ATTR_BODY_END_KEY = 'bodyEnd';
	const ATTR_ADDITIONAL_KEY = 'additional';
	const ATTR_CONTENT_KEY = 'content';
	const ATTR_DIRECTIVE_KEY = 'directive';
	const ATTR_LOCATION_KEY = 'location';
	const ATTR_CONFIG_KEY = 'config';
	
	const DIRECTIVE_REDIRECT = 'redirect';
	const DIRECTIVE_REDIRECT_BACK = 'redirectBack';
	const DIRECTIVE_REDIRECT_TO_REFERER = 'redirectToReferer';
	
	private $data = array();
	private $jsonPayload;
	
	public function __construct(array $additionalAttrs = array()) {
		$this->applyAdditionalAttrs($additionalAttrs);		
	}
	
	public function prepareForResponse(Response $response) {
		$this->jsonPayload = new JsonPayload($this->data);
		$this->jsonPayload->prepareForResponse($response);
	}
	
	public function getBufferedContents(): string {
		IllegalStateException::assertTrue($this->jsonPayload !== null, 'JhtmlJsonPayload was never prepared for Response.');
		return $this->jsonPayload->getBufferedContents();
	}
	
	public function applyRedirect(string $directive, string $httpLocation, JhtmlExec $jhtmlExec = null) {
		$this->data[self::ATTR_DIRECTIVE_KEY] = $directive;
		$this->data[self::ATTR_LOCATION_KEY] = $httpLocation;
		if ($jhtmlExec !== null) {
			$this->data[self::ATTR_CONFIG_KEY] = $jhtmlExec->toAttrs();
		}
	}
	
	public function applyView(HtmlView $view) {
		if (!$view->isInitialized()) {
			$view->initialize();
		}
		
		$this->data[self::ATTR_HEAD_KEY] = array();
		$this->data[self::ATTR_BODY_START_KEY] = array();
		$this->data[self::ATTR_BODY_END_KEY] = array(); 
		$this->data[self::ATTR_CONTENT_KEY] = $view->build(new SimpleBuildContext());
		
		foreach ($view->getHtmlProperties()->fetchUiComponentHtmlSnipplets(HtmlBuilderMeta::getKeys())
				as $name => $htmlSnipplets) {
			switch ($name) {
				case HtmlBuilderMeta::TARGET_BODY_START:
					$this->data[self::ATTR_BODY_START_KEY] = array_merge($this->data[self::ATTR_BODY_START_KEY], $htmlSnipplets);
					break;
				case HtmlBuilderMeta::TARGET_BODY_END:
					$this->data[self::ATTR_BODY_END_KEY] = array_merge($this->data[self::ATTR_BODY_END_KEY], $htmlSnipplets);
					break;
				default:
					$this->data[self::ATTR_HEAD_KEY] = array_merge($this->data[self::ATTR_HEAD_KEY], $htmlSnipplets);
					break;
			}
		}
		
		$this->data[self::ATTR_HEAD_KEY] = array_values($this->data[self::ATTR_HEAD_KEY]);
		$this->data[self::ATTR_BODY_START_KEY] = array_values($this->data[self::ATTR_BODY_START_KEY]);
		$this->data[self::ATTR_BODY_END_KEY] = array_values($this->data[self::ATTR_BODY_END_KEY]);
	}
	
	public function applyUiComponent(UiComponent $uiComponent) {
		$this->data[self::ATTR_CONTENT_KEY] = $uiComponent->build(new SimpleBuildContext());
	}
	
	public function applyAdditionalAttrs($additionalAttrs) {
		$this->data[self::ATTR_ADDITIONAL_KEY] = $additionalAttrs;
	}
	
	/**
	 * {@inheritDoc}
	 * @see \n2n\web\http\payload\Payload::toKownPayloadString()
	 */
	public function toKownPayloadString(): string {
		return 'Jhtml json payload';
	}

}
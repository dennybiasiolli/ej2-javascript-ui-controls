import { Maps, Orientation, ITouches, ZoomSettings } from '../../index';
import { Point, getElementByID, Size, PathOption, Rect, convertGeoToPoint, CircleOption, convertTileLatLongToPoint } from '../utils/helper';
import { RectOption, PolygonOption, createTooltip, calculateScale, getTouchCenter, getTouches, targetTouches } from '../utils/helper';
import { MapLocation, zoomAnimate, smoothTranslate , measureText, textTrim, clusterTemplate, marker } from '../utils/helper';
import { markerTemplate, removeElement, getElement, clusterSeparate, markerColorChoose } from '../utils/helper';
import { markerShapeChoose   } from '../utils/helper';
import { isNullOrUndefined, EventHandler, Browser, remove, createElement } from '@syncfusion/ej2-base';
import { MarkerSettings, LayerSettings, changeBorderWidth, IMarkerRenderingEventArgs, markerRendering, } from '../index';
import { IMapZoomEventArgs, IMapPanEventArgs } from '../model/interface';
import { pan } from '../model/constants';
import { getValueFromObject } from '../utils/helper';
import { PanDirection } from '../utils/enum';
import { FontModel, DataLabelSettingsModel, BorderModel } from '../model/base-model';
import { MapsTooltip } from './tooltip';

/**
 * Zoom module used to process the zoom for maps
 */
/* tslint:disable:max-line-length */
export class Zoom {
    private maps: Maps;
    public toolBarGroup: Element;
    private groupElements: Element[];
    private currentToolbarEle: Element;
    public zoomingRect: Rect;
    public selectionColor: string;
    private fillColor: string;
    private zoomInElements: Element;
    private zoomOutElements: Element;
    private zoomElements: Element;
    private panElements: Element;
    public isPanning: boolean = false;
    public mouseEnter: boolean = false;
    public baseTranslatePoint: Point;
    private wheelEvent: string;
    private cancelEvent: string;
    public currentScale: number;
    public isTouch: boolean = false;
    public rectZoomingStart: boolean = false;
    public touchStartList: ITouches[] | TouchList;
    public touchMoveList: ITouches[] | TouchList;
    public previousTouchMoveList: ITouches[] | TouchList;
    private pinchRect: Rect = new Rect(0, 0, 0, 0);
    public mouseDownPoints: Point;
    public mouseMovePoints: Point;
    public isDragZoom: boolean;
    public currentLayer: LayerSettings;
    private panColor: string;
    public zoomColor: string;
    public browserName: string = Browser.info.name;
    public isPointer: Boolean = Browser.isPointer;
    private handled: boolean = false;
    private fingers: number;
    public firstMove: boolean;
    private interaction: string;
    private lastScale: number;
    private pinchFactor: number = 1;
    private startTouches: Object[] = [];
    private shapeZoomLocation: Object = [];
    private zoomshapewidth: Object;
    private index: number;
    public intersect: object[] = [];
    private templateCount: number;
    private distanceX: number;
    private distanceY: number;
    public mouseDownLatLong: object = { x: 0, y: 0 };
    public mouseMoveLatLong: object = { x: 0, y: 0 };
    /**
     * @private
     */
    public isSingleClick: boolean = false;
    /** @private */
    public layerCollectionEle: Element;
    constructor(maps: Maps) {
        this.maps = maps;
        this.wheelEvent = this.browserName === 'mozilla' ? (this.isPointer ? 'mousewheel' : 'DOMMouseScroll') : 'mousewheel';
        this.cancelEvent = this.isPointer ? 'pointerleave' : 'mouseleave';
        this.selectionColor = this.maps.zoomSettings.selectionColor;
        this.fillColor = this.maps.zoomSettings.color;
        this.addEventListener();
        this.groupElements = [];
    }

    /* tslint:disable:no-string-literal */
    /**
     * To perform zooming for maps
     * @param position
     * @param newZoomFactor
     * @param type
     */
    public performZooming(position: Point, newZoomFactor: number, type: string): void {
        let map: Maps = this.maps;
        map.previousProjection = map.projectionType;
        map.defaultState = false;
        map.initialCheck = false;
        map.markerZoomedState = false;
        map.zoomPersistence = map.enablePersistence;
        let prevLevel: number = map.tileZoomLevel;
        let scale: number = map.previousScale = map.scale;
        let maxZoom: number = map.zoomSettings.maxZoom;
        let minZoom: number = map.zoomSettings.minZoom;
        newZoomFactor = (minZoom > newZoomFactor && type === 'ZoomIn') ? minZoom + 1 : newZoomFactor;
        let prevTilePoint: Point = map.tileTranslatePoint;
        if ((!map.isTileMap) && (type === 'ZoomIn' ? newZoomFactor >= minZoom && newZoomFactor <= maxZoom : newZoomFactor >= minZoom)) {
            let availSize: Rect = map.mapAreaRect;
            let minBounds: Object = map.baseMapRectBounds['min'] as Object;
            let maxBounds: Object = map.baseMapRectBounds['max'] as Object;
            let mapTotalWidth: number = Math.abs(minBounds['x'] - maxBounds['x']);
            let mapTotalHeight: number = Math.abs(minBounds['y'] - maxBounds['y']);
            let point: Point = map.translatePoint;
            let translatePointX: number = point.x - (((availSize.width / scale) - (availSize.width / newZoomFactor)) / (availSize.width / position.x));
            let translatePointY: number = point.y - (((availSize.height / scale) - (availSize.height / newZoomFactor)) / (availSize.height / position.y));
            let currentHeight: number = Math.abs(map.baseMapRectBounds['max']['y'] - map.baseMapRectBounds['min']['y']) * newZoomFactor;
            translatePointX = (currentHeight < map.mapAreaRect.height) ? (availSize.x + ((-(minBounds['x'])) + ((availSize.width / 2) - (mapTotalWidth / 2)))) : translatePointX;
            translatePointY = (currentHeight < map.mapAreaRect.height) ? (availSize.y + ((-(minBounds['y'])) + ((availSize.height / 2) - (mapTotalHeight / 2)))) : translatePointY;
            map.translatePoint = new Point(translatePointX, translatePointY);
            map.scale = newZoomFactor;
            this.triggerZoomEvent(prevTilePoint, prevLevel, type);
            this.applyTransform();
        } else if ((map.isTileMap) && (newZoomFactor >= minZoom && newZoomFactor <= maxZoom)) {
            this.getTileTranslatePosition(prevLevel, newZoomFactor, position, type);
            map.tileZoomLevel = newZoomFactor;
            map.zoomSettings.zoomFactor = newZoomFactor;
            map.scale = Math.pow(2, newZoomFactor - 1);
            if (type === 'ZoomOut' && map.zoomSettings.resetToInitial && map.applyZoomReset && newZoomFactor <= map.initialZoomLevel) {
                map.initialCheck = true;
                map.zoomPersistence = false;
                map.tileTranslatePoint.x = map.initialTileTranslate.x;
                map.tileTranslatePoint.y = map.initialTileTranslate.y;
                newZoomFactor = map.tileZoomLevel = map.mapScaleValue = map.initialZoomLevel;
                map.scale = Math.pow(2, newZoomFactor - 1);
            }
            map.translatePoint.y = (map.tileTranslatePoint.y - (0.01 * map.mapScaleValue)) / map.scale;
            map.translatePoint.x = (map.tileTranslatePoint.x - (0.01 * map.mapScaleValue)) / map.scale;
            this.triggerZoomEvent(prevTilePoint, prevLevel, type);
            if (document.querySelector('.GroupElement')) {
                (document.querySelector('.GroupElement') as HTMLElement).style.display = 'none';
            }
            if (document.getElementById(this.maps.element.id + '_LayerIndex_1')) {
                document.getElementById(this.maps.element.id + '_LayerIndex_1').style.display = 'none';
            }
            map.mapLayerPanel.generateTiles(newZoomFactor, map.tileTranslatePoint, type + 'wheel', null, position);
            let element1: HTMLElement = document.getElementById(this.maps.element.id + '_tiles');
            setTimeout(() => {
                // if (type === 'ZoomOut') {
                //     element1.removeChild(element1.children[element1.childElementCount - 1]);
                //     if (element1.childElementCount) {
                //         element1.removeChild(element1.children[element1.childElementCount - 1]);
                //     } else {
                //         element1 = element1;
                //     }
                // }
                this.applyTransform();
                if (document.getElementById(this.maps.element.id + '_LayerIndex_1')) {
                    document.getElementById(this.maps.element.id + '_LayerIndex_1').style.display = 'block';
                }
            // tslint:disable-next-line:align
            }, 250);
        }
        this.maps.zoomNotApplied = false;
    }

    private triggerZoomEvent(prevTilePoint: Point, prevLevel: number, type: string): void {
        let map: Maps = this.maps; let zoomArgs: IMapZoomEventArgs;
        if (!map.isTileMap) {
            zoomArgs = {
                cancel: false, name: 'zoom', type: type, maps: !map.isBlazor ? map : null,
                tileTranslatePoint: {}, translatePoint: { previous: map.previousPoint, current: map.translatePoint },
                tileZoomLevel: {}, scale: { previous: map.previousScale, current: map.scale }
            };
        } else {
            zoomArgs = {
                cancel: false, name: 'zoom', type: type, maps: !map.isBlazor ? map : null,
                tileTranslatePoint: { previous: prevTilePoint, current: map.tileTranslatePoint }, translatePoint: { previous: map.previousPoint, current: map.translatePoint },
                tileZoomLevel: { previous: prevLevel, current: map.tileZoomLevel }, scale: { previous: map.previousScale, current: map.scale }
            };
        }
        map.trigger('zoom', zoomArgs);
    }

    private getTileTranslatePosition(prevLevel: number, currentLevel: number, position: Point, type?: string): void {
        let map: Maps = this.maps;
        let tileDefaultSize: number = 256;
        let padding: number = type === 'ZoomOut' ? 10 : (type === 'Reset' && currentLevel > 1) ? 0 : 10;
        let bounds: Size = map.availableSize;
        let prevSize: number = Math.pow(2, prevLevel) * 256;
        let totalSize: number = Math.pow(2, currentLevel) * 256;
        let x: number = ((position.x - map.tileTranslatePoint.x) / prevSize) * 100;
        let y: number = ((position.y - map.tileTranslatePoint.y) / prevSize) * 100;
        map.tileTranslatePoint.x = (currentLevel === 1) ? (bounds.width / 2) - ((tileDefaultSize * 2) / 2) :
            position.x - ((x * totalSize) / 100);
        map.tileTranslatePoint.y = (currentLevel === 1) ? ((bounds.height / 2) - ((tileDefaultSize * 2) / 2) + (padding * 2)) :
            position.y - ((y * totalSize) / 100);
    }

    public performRectZooming(): void {
        this.isDragZoom = true;
        let map: Maps = this.maps;
        let size: Size = map.availableSize;
        map.previousProjection = map.projectionType;
        let prevLevel: number = map.tileZoomLevel;
        let prevTilePoint: Point = map.tileTranslatePoint;
        let zoomRect: Rect = this.zoomingRect;
        let maxZoom: number = map.zoomSettings.maxZoom;
        let minZoom: number = map.zoomSettings.minZoom;
        if (zoomRect.height > 0 && zoomRect.width > 0) {
            let x: number = this.zoomingRect.x + (this.zoomingRect.width / 2);
            let y: number = this.zoomingRect.y + (this.zoomingRect.height / 2);
            let zoomCalculationFactor: number;
            if (!map.isTileMap) {
                let scale: number = map.previousScale = map.scale;
                zoomCalculationFactor = scale + Math.round((((size.width / zoomRect.width) + (size.height / zoomRect.height)) / 2));
                let translatePoint: Point = map.previousPoint = map.translatePoint;
                let translatePointX: number = translatePoint.x - (((size.width / scale) - (size.width / zoomCalculationFactor)) / (size.width / x));
                let translatePointY: number = translatePoint.y - (((size.height / scale) - (size.height / zoomCalculationFactor)) / (size.height / y));
                map.translatePoint = new Point(translatePointX, translatePointY);
                map.scale = zoomCalculationFactor;
                this.triggerZoomEvent(prevTilePoint, prevLevel, '');
            } else {
                zoomCalculationFactor = prevLevel + (Math.round(prevLevel + (((size.width / zoomRect.width) + (size.height / zoomRect.height)) / 2)));
                zoomCalculationFactor = (zoomCalculationFactor >= minZoom && zoomCalculationFactor <= maxZoom) ? zoomCalculationFactor : maxZoom;
                map.zoomSettings.zoomFactor = zoomCalculationFactor;
                this.getTileTranslatePosition(prevLevel, zoomCalculationFactor, { x: x, y: y });
                map.tileZoomLevel = zoomCalculationFactor;
                map.translatePoint.x = (map.tileTranslatePoint.x - (0.5 * Math.pow(2, zoomCalculationFactor))) /
                    (Math.pow(2, zoomCalculationFactor));
                map.translatePoint.y = (map.tileTranslatePoint.y - (0.5 * Math.pow(2, zoomCalculationFactor))) /
                    (Math.pow(2, zoomCalculationFactor));
                map.scale = (Math.pow(2, zoomCalculationFactor));
                this.triggerZoomEvent(prevTilePoint, prevLevel, '');
                map.mapLayerPanel.generateTiles(zoomCalculationFactor, map.tileTranslatePoint);
            }
            map.mapScaleValue = zoomCalculationFactor;
            this.applyTransform(true);
            this.maps.zoomNotApplied = false;
            this.zoomingRect = null;
        }
    }

    private setInteraction(newInteraction: string): void {
        this.lastScale = 1;
        this.interaction = newInteraction;
    }

    private updateInteraction(): void {
        if (this.fingers === 2) {
            this.setInteraction('zoom');
        } else {
            this.setInteraction(null);
        }
    }

    public performPinchZooming(e: PointerEvent | TouchEvent): void {
        let map: Maps = this.maps;
        let prevLevel: number = map.tileZoomLevel;
        let availSize: Rect = map.mapAreaRect;
        map.previousScale = map.scale;
        map.previousPoint = map.translatePoint;
        let prevTilePoint: Point = map.tileTranslatePoint;
        let scale: number = calculateScale(<ITouches[]>this.touchStartList, <ITouches[]>this.touchMoveList);
        let touchCenter: Point = getTouchCenter(getTouches(<ITouches[]>this.touchMoveList, this.maps));
        let newScale: number = scale / this.lastScale;
        this.lastScale = scale;
        this.pinchFactor *= newScale;
        this.pinchFactor = Math.min(this.maps.zoomSettings.maxZoom, Math.max(this.pinchFactor, this.maps.zoomSettings.minZoom));
        let zoomCalculationFactor: number = this.pinchFactor;
        let zoomArgs: IMapZoomEventArgs;
        if (!map.isTileMap) {
            let minBounds: Object = map.baseMapRectBounds['min'] as Object;
            let maxBounds: Object = map.baseMapRectBounds['max'] as Object;
            let mapTotalWidth: number = Math.abs(minBounds['x'] - maxBounds['x']);
            let mapTotalHeight: number = Math.abs(minBounds['y'] - maxBounds['y']);
            let translatePoint: Point = map.translatePoint;
            let currentHeight: number = Math.abs(map.baseMapRectBounds['max']['y'] - map.baseMapRectBounds['min']['y']) * zoomCalculationFactor;
            let translatePointX: number = translatePoint.x - (((availSize.width / map.scale) - (availSize.width / zoomCalculationFactor)) / (availSize.width / touchCenter.x));
            let translatePointY: number = translatePoint.y - (((availSize.height / map.scale) - (availSize.height / zoomCalculationFactor)) / (availSize.height / touchCenter.y));
            translatePointX = (currentHeight < map.mapAreaRect.height) ? (availSize.x + ((-(minBounds['x'])) + ((availSize.width / 2) - (mapTotalWidth / 2)))) : translatePointX;
            translatePointY = (currentHeight < map.mapAreaRect.height) ? (availSize.y + ((-(minBounds['y'])) + ((availSize.height / 2) - (mapTotalHeight / 2)))) : translatePointY;
            map.translatePoint = new Point(translatePointX, translatePointY);
            map.scale = zoomCalculationFactor;
            this.triggerZoomEvent(prevTilePoint, prevLevel, '');
        } else {
            let newTileFactor: number = zoomCalculationFactor;
            this.getTileTranslatePosition(prevLevel, newTileFactor, { x: touchCenter.x, y: touchCenter.y });
            map.tileZoomLevel = newTileFactor;
            map.translatePoint.x = (map.tileTranslatePoint.x - (0.5 * Math.pow(2, newTileFactor))) /
                (Math.pow(2, newTileFactor));
            map.translatePoint.y = (map.tileTranslatePoint.y - (0.5 * Math.pow(2, newTileFactor))) /
                (Math.pow(2, newTileFactor));
            map.scale = (Math.pow(2, newTileFactor));
            this.triggerZoomEvent(prevTilePoint, prevLevel, '');
            map.mapLayerPanel.generateTiles(newTileFactor, map.tileTranslatePoint);
        }
        this.applyTransform();
    }

    public drawZoomRectangle(): void {
        let map: Maps = this.maps;
        let down: Point = this.mouseDownPoints;
        let move: Point = this.mouseMovePoints;
        let x: number; let y: number; let width: number; let height: number;
        let border: Object = { width: 1, color: '#009900' };
        width = Math.abs(move.x - down.x);
        height = Math.abs(move.y - down.y);
        x = ((move.x > down.x) ? down.x : down.x - width);
        y = ((move.y > down.y) ? down.y : down.y - height);
        let elementRect: ClientRect = getElementByID(map.element.id).getBoundingClientRect();
        if ((x > map.mapAreaRect.x && x < (map.mapAreaRect.x + map.mapAreaRect.width)) &&
            (y > map.mapAreaRect.y) && (y < map.mapAreaRect.y + map.mapAreaRect.height)) {
            this.zoomingRect = new Rect(x, y, width, height);
            let rectSVGObject: Element = map.renderer.createSvg({
                id: map.element.id + '_Selection_Rect_Zooming',
                width: map.availableSize.width,
                height: map.availableSize.height,
            });
            let rectOption: RectOption = new RectOption(
                map.element.id + '_ZoomRect', '#d3d3d3', border, 0.5, this.zoomingRect, 0, 0, '', '3'
            );
            rectSVGObject.appendChild(map.renderer.drawRectangle(rectOption));
            getElementByID(map.element.id + '_Secondary_Element').appendChild(rectSVGObject);
        }
    }
    /**
     * To animate the zooming process
     */
    private animateTransform(element: Element, animate: boolean, x: number, y: number, scale: number): void {
        let duration: number = this.currentLayer.animationDuration;
        if (!animate || duration === 0) {
            element.setAttribute('transform', 'scale(' + (scale) + ') translate( ' + x + ' ' + y + ' )');
            return;
        }
        zoomAnimate(element, 0, duration, new MapLocation(x, y), scale, this.maps.mapAreaRect, this.maps);
    }

    //tslint:disable:max-func-body-length
    public applyTransform(animate?: boolean): void {
        let layerIndex: number;
        this.templateCount = 0;
        let layer: LayerSettings;
        let zoomshapelocation: object;
        let i: number; let markerStyle: string;
        let scale: number = this.maps.scale;
        let x: number = this.maps.translatePoint.x;
        let y: number = this.maps.translatePoint.y;
        let collection: Object[] = []; this.maps.zoomShapeCollection = [];
        if (document.getElementById(this.maps.element.id + '_mapsTooltip')) {
          removeElement(this.maps.element.id + '_mapsTooltip');
        }
        if (this.layerCollectionEle) {
            for (let i: number = 0; i < this.layerCollectionEle.childElementCount; i++) {
                let layerElement: Element = this.layerCollectionEle.childNodes[i] as Element;
                if (layerElement.tagName === 'g') {
                    this.templateCount++;
                    this.index = layerElement.id.indexOf('_LayerIndex_') > -1 && parseFloat(layerElement.id.split('_LayerIndex_')[1].split('_')[0]);
                    this.currentLayer = <LayerSettings>this.maps.layersCollection[this.index];
                    let factor: number = this.maps.mapLayerPanel.calculateFactor(this.currentLayer);
                    for (let j: number = 0; j < layerElement.childElementCount; j++) {
                        let currentEle: Element = layerElement.childNodes[j] as Element;
                        if (!(currentEle.id.indexOf('_Markers_Group') > -1) && (!(currentEle.id.indexOf('_bubble_Group') > -1))
                            && (!(currentEle.id.indexOf('_dataLableIndex_Group') > -1))
                        ) {
                            if (this.maps.isTileMap && (currentEle.id.indexOf('_line_Group') > -1)) {
                                currentEle.remove();
                                if (layerElement.children.length > 0 && layerElement.children[0]) {
                                    layerElement.insertBefore(
                                        this.maps.navigationLineModule.renderNavigation(
                                            this.currentLayer, this.maps.tileZoomLevel, this.index
                                        ),
                                        layerElement.children[0]
                                    );
                                } else {
                                    layerElement.appendChild(this.maps.navigationLineModule.renderNavigation(this.currentLayer, this.maps.tileZoomLevel, this.index));
                                }
                            } else {
                                changeBorderWidth(currentEle, this.index, scale, this.maps);
                                this.maps.zoomTranslatePoint = this.maps.translatePoint;
                                this.animateTransform(currentEle, animate, x, y, scale);
                                this.shapeZoomLocation = currentEle.childNodes;
                            }

                        } else if (currentEle.id.indexOf('_Markers_Group') > -1) {
                            if (!this.isPanning || this.maps.isBlazor) {
                              this.markerTranslates(<Element>currentEle.childNodes[0], factor, x, y, scale, 'Marker', layerElement, animate);
                            }
                            currentEle = layerElement.childNodes[j] as Element;
                            if (!isNullOrUndefined(currentEle)) {
                                for (let k: number = 0; k < currentEle.childElementCount; k++) {
                                    this.markerTranslate(<Element>currentEle.childNodes[k], factor, x, y, scale, 'Marker', animate);
                                    let layerIndex : number = parseInt(currentEle.childNodes[k]['id'].split('_LayerIndex_')[1].split('_')[0], 10);
                                    let dataIndex : number = parseInt(currentEle.childNodes[k]['id'].split('_dataIndex_')[1].split('_')[0], 10);
                                    let markerIndex  : number = parseInt(currentEle.childNodes[k]['id'].split('_MarkerIndex_')[1].split('_')[0], 10);
                                    let markerSelectionValues : object = this.currentLayer.markerSettings[markerIndex].dataSource[dataIndex];
                                    for (let x : number = 0; x < this.currentLayer.markerSettings[markerIndex].initialMarkerSelection.length; x++) {
                                        if (this.currentLayer.markerSettings[markerIndex].initialMarkerSelection[x]['latitude'] ===
                                            markerSelectionValues['latitude'] ||
                                            this.currentLayer.markerSettings[markerIndex].initialMarkerSelection[x]['longitude'] ===
                                            markerSelectionValues['longitude']) {
                                                this.maps.markerSelection(this.currentLayer.markerSettings[markerIndex].selectionSettings,
                                                                          this.maps, currentEle.children[k],
                                                                          this.currentLayer.markerSettings[markerIndex].dataSource[dataIndex]
                                                                          );
                                        }
                                    }
                                    if (!this.maps.isTileMap && this.currentLayer.animationDuration > 0) {
                                        markerStyle = 'visibility:hidden';
                                        currentEle.setAttribute('style', markerStyle);
                                    }
                                }
                                if (this.isPanning && this.maps.markerModule.sameMarkerData.length > 0) {
                                    clusterSeparate(this.maps.markerModule.sameMarkerData, this.maps, currentEle, true);
                                } else if (this.maps.markerModule.sameMarkerData.length > 0) {
                                    this.maps.markerModule.sameMarkerData = [];
                                    if (document.getElementById(this.maps.element.id + '_mapsTooltip')) {
                                        removeElement(this.maps.element.id + '_mapsTooltip');
                                    }
                                }
                                if (document.getElementById(this.maps.element.id + '_mapsTooltip') && this.maps.mapsTooltipModule.tooltipTargetID.indexOf('_MarkerIndex_')
                                    && !this.isPanning) {
                                    let mapsTooltip: MapsTooltip = this.maps.mapsTooltipModule;
                                    let tooltipElement: Element = currentEle.querySelector('#' + mapsTooltip.tooltipTargetID);
                                    if (!isNullOrUndefined(tooltipElement)) {
                                        if (tooltipElement['style']['visibility'] === 'hidden') {
                                            removeElement(this.maps.element.id + '_mapsTooltip');
                                        } else {
                                            let x: number = parseFloat(tooltipElement.getAttribute('transform').split('(')[1].split(')')[0].split(' ')[1]);
                                            let y: number = parseFloat(tooltipElement.getAttribute('transform').split('(')[1].split(')')[0].split(' ')[2]);
                                            if (this.maps.isTileMap) {
                                                x += +getElement(this.maps.element.id + '_tile_parent')['style']['left'].split('px')[0];
                                                y += +getElement(this.maps.element.id + '_tile_parent')['style']['top'].split('px')[0];
                                            }
                                            mapsTooltip.svgTooltip.location.x = x;
                                            mapsTooltip.svgTooltip.location.y = y;
                                            mapsTooltip.svgTooltip.enableAnimation = false;
                                        }
                                    }
                                }
                            }
                        } else if (currentEle.id.indexOf('_bubble_Group') > -1) {
                            let childElement: HTMLElement;
                            for (let k: number = 0; k < currentEle.childElementCount; k++) {
                                childElement = currentEle.childNodes[k] as HTMLElement;
                                let bubbleTransform: string = childElement.getAttribute('transform');
                                layerIndex = parseFloat(childElement.id.split('_LayerIndex_')[1].split('_')[0]);
                                let bubleIndex: number = parseFloat(childElement.id.split('_BubbleIndex_')[1].split('_')[0]);
                                let dataIndex: number = parseFloat(childElement.id.split('_BubbleIndex_')[1].split('_')[2]);
                                for (let l: number = 0; l < this.maps.bubbleModule.bubbleCollection.length; l++) {
                                    let bubbleCollection: Object = this.maps.bubbleModule.bubbleCollection[l];
                                    if (bubbleCollection['LayerIndex'] === layerIndex && bubbleCollection['BubbleIndex'] === bubleIndex &&
                                        bubbleCollection['DataIndex'] === dataIndex) {
                                        let centerX: number = bubbleCollection['center']['x'];
                                        let centerY: number = bubbleCollection['center']['y'];
                                        let currentX: number = ((centerX + x) * scale);
                                        let currentY: number = ((centerY + y) * scale);
                                        let duration: number = this.currentLayer.animationDuration;
                                        if (!animate || duration === 0) {
                                            childElement.setAttribute('transform', 'translate( ' + currentX + ' ' + currentY + ' )');
                                        } else {
                                            smoothTranslate(childElement, 0, duration, new MapLocation(currentX, currentY));
                                        }
                                        break;
                                    }
                                }
                            }
                        } else if (currentEle.id.indexOf('_dataLableIndex_Group') > -1) {
                            this.intersect = []; this.maps.zoomLabelPositions = [];
                            this.maps.zoomLabelPositions = this.maps.dataLabelModule.dataLabelCollections;
                            for (let k: number = 0; k < currentEle.childElementCount; k++) {
                                if (currentEle.childNodes[k]['id'].indexOf('_LabelIndex_') > -1) {
                                    let labelIndex: number = parseFloat(currentEle.childNodes[k]['id'].split('_LabelIndex_')[1].split('_')[0]);
                                    this.zoomshapewidth = this.shapeZoomLocation[labelIndex].getBoundingClientRect();
                                    this.maps.zoomShapeCollection.push(this.zoomshapewidth);
                                    this.dataLabelTranslate(<Element>currentEle.childNodes[k], factor, x, y, scale, 'DataLabel', animate);
                                    let dataLabel: DataLabelSettingsModel = this.maps.layers[this.index].dataLabelSettings;
                                    let border: BorderModel = dataLabel.border;
                                    if (k > 0 && border['width'] > 1) {
                                        if (currentEle.childNodes[k - 1]['id'].indexOf('_rectIndex_') > -1) {
                                            let labelX: number = ((this.maps.zoomLabelPositions[labelIndex]['location']['x'] + x) * scale);
                                            let labelY: number = ((this.maps.zoomLabelPositions[labelIndex]['location']['y'] + y) * scale);
                                            let zoomtext: string = currentEle.childNodes[k]['innerHTML'];
                                            let style: FontModel = this.maps.layers[this.index].dataLabelSettings.textStyle;
                                            let zoomtextSize: Size = measureText(zoomtext, style);
                                            let padding: number = 5;
                                            let rectElement: ChildNode = currentEle.childNodes[k - 1];
                                            let rectX: number = labelX - zoomtextSize['width'] / 2;
                                            let rectY: number = labelY - zoomtextSize['height'] / 2 - padding;
                                            rectElement['setAttribute']('x', rectX);
                                            rectElement['setAttribute']('y', rectY);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                this.maps.arrangeTemplate();
                let blazor: void = this.maps.isBlazor ? this.maps.blazorTemplates() : null;
            }
            if (!isNullOrUndefined(this.currentLayer)) {
                if (!animate || this.currentLayer.animationDuration === 0) {
                    this.processTemplate(x, y, scale, this.maps);
                }
            }
        }
    }
    //tslint:disable
    private markerTranslates(
        element: Element | HTMLElement, factor: number, x: number, y: number, scale: number, type: string, layerElement: Element, animate: boolean = false,
        ): void {
            let markerSVGObject: Element;
            let templateFn: Function;
            let nullCount: number = 0;
            let markerCounts: number = 0;
            let markerTemplateCounts : number = 0;  
            let layerIndex: number = parseInt((element ? element : layerElement).id.split('_LayerIndex_')[1].split('_')[0], 10);   
            markerSVGObject = this.maps.renderer.createGroup({
                id: this.maps.element.id + '_Markers_Group',
                class: 'GroupElement',
                style: 'pointer-events: auto;'
            });
            if (document.getElementById(markerSVGObject.id)) {
                removeElement(markerSVGObject.id);
            }
			let mapsAreaRect: Rect = this.maps.mapAreaRect; 
            let markerTemplateElements: HTMLElement = createElement('div', {
                id: this.maps.element.id + '_LayerIndex_' + layerIndex + '_Markers_Template_Group',
                className: 'template',
                styles: 'overflow: hidden; position: absolute;pointer-events: none;' +
                    'top:' + mapsAreaRect.y + 'px;' +
                    'left:' + mapsAreaRect.x + 'px;' +
                    'height:' + mapsAreaRect.height + 'px;' +
                    'width:' + mapsAreaRect.width + 'px;'
            });
            if (document.getElementById(markerTemplateElements.id)) {
                removeElement(markerTemplateElements.id);
            }
            let currentLayers: LayerSettings = <LayerSettings>this.maps.layersCollection[layerIndex];
            currentLayers.markerSettings.map((markerSettings: MarkerSettings, markerIndex: number) => {
                let markerDatas: Object[] = <Object[]>markerSettings.dataSource;
                Array.prototype.forEach.call(markerDatas, (data: Object, dataIndex: number) => {
                    this.maps.markerNullCount = markerIndex >= 0 && dataIndex === 0 ? 0 : this.maps.markerNullCount;
                    let eventArgs: IMarkerRenderingEventArgs = {
                        template: markerSettings.template, data: data, maps: this.maps, marker: markerSettings,
                        cancel: false, name: markerRendering, fill: markerSettings.fill, colorValuePath: markerSettings.colorValuePath,
                        shapeValuePath: markerSettings.shapeValuePath, height: markerSettings.height,
                        width: markerSettings.width, imageUrl: markerSettings.imageUrl,
                        imageUrlValuePath: markerSettings.imageUrlValuePath, shape: markerSettings.shape, border: markerSettings.border
                    };
                    eventArgs = markerShapeChoose(eventArgs, data);
                    eventArgs = markerColorChoose(eventArgs, data);
                    if (this.maps.isBlazor) {
                        const {maps, marker, ...blazorEventArgs } : IMarkerRenderingEventArgs = eventArgs;
                        eventArgs = blazorEventArgs;
                        let latitudeValue: string = 'Latitude';
                        let longitudeValue: string = 'Longitude';
                        markerSettings.longitudeValuePath = !isNullOrUndefined(markerSettings.longitudeValuePath) ?
                        markerSettings.longitudeValuePath : !isNullOrUndefined(data['Longitude']) ? longitudeValue :
                        !isNullOrUndefined(data['longitude']) ? 'longitude' : null;
                        markerSettings.latitudeValuePath = !isNullOrUndefined(markerSettings.latitudeValuePath) ?
                        markerSettings.latitudeValuePath : !isNullOrUndefined(data['Latitude']) ? latitudeValue :
                        !isNullOrUndefined(data['latitude']) ? 'latitude' : null;
                    }
                    this.maps.trigger('markerRendering', eventArgs, (MarkerArgs: IMarkerRenderingEventArgs) => {
                        if (markerSettings.shapeValuePath !== eventArgs.shapeValuePath ) {
                            eventArgs = markerShapeChoose(eventArgs, data);
                        }
                        if (markerSettings.colorValuePath !== eventArgs.colorValuePath ) {
                            eventArgs = markerColorChoose(eventArgs, data);
                        }
                        let lati: number = (!isNullOrUndefined(markerSettings.latitudeValuePath)) ?
                            Number(getValueFromObject(data, markerSettings.latitudeValuePath)) : !isNullOrUndefined(data['latitude']) ?
                             parseFloat(data['latitude']) : !isNullOrUndefined(data['Latitude']) ? data['Latitude'] : 0;
                        let long: number = (!isNullOrUndefined(markerSettings.longitudeValuePath)) ?
                         Number(getValueFromObject(data, markerSettings.longitudeValuePath)) : !isNullOrUndefined(data['longitude']) ?
                         parseFloat(data['longitude']) : !isNullOrUndefined(data['Longitude']) ? data['Longitude'] : 0;
                        if (this.maps.isBlazor) {
                            let data1: Object = {};
                            let j: number = 0;
                            let text: string[] = [];
                            for (let i: number = 0; i < Object.keys(data).length; i++) {
                                if (Object.keys(data)[i].toLowerCase() !== 'text' && Object.keys(data)[i].toLowerCase() !== 'latitude'
                                    && Object.keys(data)[i].toLowerCase() !== 'blazortemplateid' && Object.keys(data)[i].toLowerCase() !== 'longitude'
                                    && Object.keys(data)[i].toLowerCase() !== 'name') {
                                    data1['text'] = text;
                                    text[j] = data[Object.keys(data)[i].toLowerCase()];                                    
                                    j++;
                                }
                            }
                            data['text'] = data1['text'];
                        }
                        let offset: Point = markerSettings.offset;
                        if (!eventArgs.cancel && markerSettings.visible && !isNullOrUndefined(long) && !isNullOrUndefined(lati)) {
                            let markerID: string = this.maps.element.id + '_LayerIndex_' + layerIndex + '_MarkerIndex_'
                                + markerIndex + '_dataIndex_' + dataIndex;
                            let location: Point = (this.maps.isTileMap) ? convertTileLatLongToPoint(
                                new MapLocation(long, lati), this.maps.tileZoomLevel, this.maps.tileTranslatePoint, true
                            ) : convertGeoToPoint(lati, long, factor, currentLayers, this.maps);
                            let animate: boolean = currentLayers.animationDuration !== 0 || isNullOrUndefined(this.maps.zoomModule);
                            let transPoint: Point = {x: x, y:y};
                            if (eventArgs.template && (!isNaN(location.x) && !isNaN(location.y))) {
                                markerTemplateCounts++;
                                markerTemplate(eventArgs, templateFn, markerID, data, markerIndex, markerTemplateElements, location,
                                    scale, offset, this.maps);   
                            } else  if (!eventArgs.template && (!isNaN(location.x) && !isNaN(location.y))) {
                                markerCounts++;
                                marker(eventArgs, markerSettings, markerDatas, dataIndex, location, transPoint,
                                    markerID, offset, scale, this.maps, markerSVGObject);
                            }
                        }
                        nullCount += (!isNaN(lati) && !isNaN(long)) ? 0 : 1;
                        markerTemplateCounts += (eventArgs.cancel) ? 1 : 0;
                        markerCounts += (eventArgs.cancel) ? 1 : 0;
                        this.maps.markerNullCount = (!isNullOrUndefined(lati) || !isNullOrUndefined(long))
                            ? this.maps.markerNullCount : this.maps.markerNullCount + 1;
                        let markerDataLength: number = markerDatas.length - this.maps.markerNullCount;
                        if (markerSVGObject.childElementCount === (markerDatas.length - markerTemplateCounts - nullCount) && (type !== 'Template')) {
                            layerElement.appendChild(markerSVGObject);
                            if (currentLayers.markerClusterSettings.allowClustering) {
                                this.maps.svgObject.appendChild(markerSVGObject);
                                this.maps.element.appendChild(this.maps.svgObject);
                                clusterTemplate(currentLayers, markerSVGObject, this.maps, layerIndex, markerSVGObject, layerElement, true, true);
                            }
                        }
                        if (markerTemplateElements.childElementCount === (markerDatas.length - markerCounts - nullCount) && getElementByID(this.maps.element.id + '_Secondary_Element')) {
                            getElementByID(this.maps.element.id + '_Secondary_Element').appendChild(markerTemplateElements);
                            if (scale <= 1) {
                                if (currentLayers.markerClusterSettings.allowClustering) {
                                    clusterTemplate(currentLayers, markerTemplateElements, this.maps, layerIndex, markerSVGObject, layerElement, false, true) ;
                                }
                            } 
                        }
                    });
                });
            });
        };
    /**
     * To translate the layer template elements
     * @private
     */
    public processTemplate(x: number, y: number, scale: number, maps: Maps): void {
        for (let i: number = 0; i < this.templateCount; i++) {
            this.currentLayer = <LayerSettings>maps.layersCollection[i];
            let factor: number = maps.mapLayerPanel.calculateFactor(this.currentLayer);
            let markerTemplateElement: HTMLElement = <HTMLElement>getElementByID(maps.element.id + '_LayerIndex_' +
                i + '_Markers_Template_Group');
            let datalabelTemplateElemement: HTMLElement = <HTMLElement>getElementByID(maps.element.id + '_LayerIndex_'
                + i + '_Label_Template_Group');
            if ((!isNullOrUndefined(markerTemplateElement)) && markerTemplateElement.childElementCount > 0) {
                for (let k: number = 0; k < markerTemplateElement.childElementCount; k++) {
                    this.markerTranslate(<HTMLElement>markerTemplateElement.childNodes[k], factor, x, y, scale, 'Template');
                }
            }
            if ((!isNullOrUndefined(datalabelTemplateElemement)) && datalabelTemplateElemement.childElementCount > 0) {
                for (let k: number = 0; k < datalabelTemplateElemement.childElementCount; k++) {
                    this.dataLabelTranslate(<HTMLElement>datalabelTemplateElemement.childNodes[k], factor, x, y, scale, 'Template');
                }
            }
        }
    }
    //tslint:disable:max-func-body-length
    private dataLabelTranslate(element: Element | HTMLElement, factor: number, x: number, y: number, scale: number, type: string, animate: boolean = false): void {
        let labelCollection: Object[] = this.maps.dataLabelModule.dataLabelCollections;
        let zoomelement: object = element.getBoundingClientRect();
        let text: string; let trimmedLable: string;
        let style: FontModel = this.maps.layers[this.index].dataLabelSettings.textStyle;
        let zoomtext: string; let zoomtextSize: Size; let zoomtrimLabel: string;
        let labelPath: string = this.maps.layers[this.index].dataLabelSettings.labelPath;
        let layerIndex: number = parseFloat(element.id.split('_LayerIndex_')[1].split('_')[0]);
        let shapeIndex: number = parseFloat(element.id.split('_shapeIndex_')[1].split('_')[0]);
        let labelIndex: number;
        if (element.id.indexOf('_LabelIndex_') > -1) {
            labelIndex = parseFloat(element.id.split('_LabelIndex_')[1].split('_')[0]);
        }
        let duration: number = this.currentLayer.animationDuration;
        for (let l: number = 0; l < labelCollection.length; l++) {
            let label: Object = labelCollection[l];
            if (label['layerIndex'] === layerIndex && label['shapeIndex'] === shapeIndex
                && label['labelIndex'] === labelIndex) {
                let labelX: number = label['location']['x'];
                let labelY: number = label['location']['y'];
                if (type === 'Template') {
                    let layerEle: Element = getElementByID(this.maps.element.id + '_Layer_Collections');
                    labelX = ((Math.abs(this.maps.baseMapRectBounds['min']['x'] - labelX)) * scale);
                    labelY = ((Math.abs(this.maps.baseMapRectBounds['min']['y'] - labelY)) * scale);
                    let templateOffset: ClientRect = element.getBoundingClientRect();
                    let layerOffset: ClientRect = layerEle.getBoundingClientRect();
                    let elementOffset: ClientRect = element.parentElement.getBoundingClientRect();
                    let x: number = ((labelX) + (layerOffset.left - elementOffset.left) - (templateOffset.width / 2));
                    let y: number = ((labelY) + (layerOffset.top - elementOffset.top) - (templateOffset.height / 2));
                    (<HTMLElement>element).style.left = x + 'px';
                    (<HTMLElement>element).style.top = y + 'px';
                } else {
                    labelX = ((labelX + x) * scale); labelY = ((labelY + y) * scale);
                    zoomtext = label['dataLabelText'];
                    zoomtextSize = measureText(zoomtext, style);
                    let start: number = labelY - zoomtextSize['height'] / 4;
                    let end: number = labelY + zoomtextSize['height'] / 4;
                    let xpositionEnds: number = labelX + zoomtextSize['width'] / 2;
                    let xpositionStart: number = labelX - zoomtextSize['width'] / 2;
                    let textLocations: object = { rightWidth: xpositionEnds, leftWidth: xpositionStart, heightTop: start, heightBottom: end };
                    if (!animate || duration === 0) {
                        element.setAttribute('transform', 'translate( ' + labelX + ' ' + labelY + ' )');
                    }
                    if (this.maps.layers[this.index].dataLabelSettings.smartLabelMode === 'Hide') {
                        if (scale > 1) {
                            text = (this.zoomshapewidth['width'] >= zoomtextSize['width']) ? zoomtext : '';
                            element.innerHTML = text;
                        } else {
                            text = (this.maps.dataLabelShape[l] >= zoomtextSize['width']) ? zoomtext : '';
                            element.innerHTML = text;
                        }
                    }
                    if (this.maps.layers[this.index].dataLabelSettings.smartLabelMode === 'Trim') {
                        if (scale > 1) {
                            zoomtrimLabel = textTrim(this.zoomshapewidth['width'], zoomtext, style);
                            text = zoomtrimLabel; element.innerHTML = text;
                        } else {
                            zoomtrimLabel = textTrim(this.maps.dataLabelShape[l], zoomtext, style);
                            text = zoomtrimLabel; element.innerHTML = text;
                        }
                    }
                    if (this.maps.layers[this.index].dataLabelSettings.intersectionAction === 'Hide') {
                        for (let m: number = 0; m < this.intersect.length; m++) {
                            if (!isNullOrUndefined(this.intersect[m])) {
                                if (textLocations['leftWidth'] > this.intersect[m]['rightWidth']
                                    || textLocations['rightWidth'] < this.intersect[m]['leftWidth']
                                    || textLocations['heightTop'] > this.intersect[m]['heightBottom']
                                    || textLocations['heightBottom'] < this.intersect[m]['heightTop']) {
                                    text = !isNullOrUndefined(text) ? text : zoomtext;
                                    element.innerHTML = text;
                                } else {
                                    text = ''; element.innerHTML = text;
                                    break;
                                }
                            }
                        }
                        this.intersect.push(textLocations);
                    }
                    if (this.maps.layers[this.index].dataLabelSettings.intersectionAction === 'Trim') {
                        for (let j: number = 0; j < this.intersect.length; j++) {
                            if (!isNullOrUndefined(this.intersect[j])) {
                                if (textLocations['rightWidth'] < this.intersect[j]['leftWidth']
                                    || textLocations['leftWidth'] > this.intersect[j]['rightWidth']
                                    || textLocations['heightBottom'] < this.intersect[j]['heightTop']
                                    || textLocations['heightTop'] > this.intersect[j]['heightBottom']) {
                                    trimmedLable = !isNullOrUndefined(text) ? text : zoomtext;
                                    if (scale > 1) {
                                        trimmedLable = textTrim(this.zoomshapewidth['width'], trimmedLable, style);
                                    }
                                    element.innerHTML = trimmedLable;
                                } else {
                                    if (textLocations['leftWidth'] > this.intersect[j]['leftWidth']) {
                                        let width: number = this.intersect[j]['rightWidth'] - textLocations['leftWidth'];
                                        let difference: number = width - (textLocations['rightWidth'] - textLocations['leftWidth']);
                                        text = !isNullOrUndefined(text) ? text : zoomtext;
                                        trimmedLable = textTrim(difference, text, style);
                                        element.innerHTML = trimmedLable;
                                        break;
                                    }
                                    if (textLocations['leftWidth'] < this.intersect[j]['leftWidth']) {
                                        let width: number = textLocations['rightWidth'] - this.intersect[j]['leftWidth'];
                                        let difference: number = Math.abs(width - (textLocations['rightWidth'] - textLocations['leftWidth']));
                                        text = !isNullOrUndefined(text) ? text : zoomtext;
                                        trimmedLable = textTrim(difference, text, style);
                                        element.innerHTML = trimmedLable;
                                        break;
                                    }
                                }
                            }
                        }
                        this.intersect.push(textLocations);
                        if (isNullOrUndefined(trimmedLable)) {
                            trimmedLable = textTrim(this.zoomshapewidth['width'], zoomtext, style);
                            element.innerHTML = trimmedLable;
                        }
                    } else {
                        smoothTranslate(element, 0, duration, new MapLocation(labelX, labelY));
                    }
                }
            }
        }
    }

    private markerTranslate(
        element: Element | HTMLElement, factor: number, x: number, y: number, scale: number, type: string, animate: boolean = false
    ): void {
        let layerIndex: number = parseInt(element.id.split('_LayerIndex_')[1].split('_')[0], 10);
        let markerIndex: number = parseInt(element.id.split('_MarkerIndex_')[1].split('_')[0], 10);
        let dataIndex: number = parseInt(element.id.split('_dataIndex_')[1].split('_')[0], 10);
        let layer: LayerSettings = <LayerSettings>this.maps.layersCollection[layerIndex];
        let marker: MarkerSettings = <MarkerSettings>layer.markerSettings[markerIndex];
        if (!isNullOrUndefined(marker) && !isNullOrUndefined(marker.dataSource) && !isNullOrUndefined(marker.dataSource[dataIndex])) {
            if (this.maps.isBlazor) {
                marker.longitudeValuePath = !isNullOrUndefined(marker.longitudeValuePath) ?
                marker.longitudeValuePath : !isNullOrUndefined(marker.dataSource[dataIndex]['Longitude']) ? 'Longitude' :
                !isNullOrUndefined(marker.dataSource[dataIndex]['longitude']) ? 'longitude' : null;
                marker.latitudeValuePath = !isNullOrUndefined(marker.latitudeValuePath) ?
                marker.latitudeValuePath : !isNullOrUndefined(marker.dataSource[dataIndex]['Latitude']) ? 'Latitude' :
                !isNullOrUndefined(marker.dataSource[dataIndex]['latitude']) ? 'latitude' : null;
                let data1: Object = {};                           
                let j: number = 0;
                let text: string[] = [];
                for (let i: number = 0; i < Object.keys(marker.dataSource[dataIndex]).length; i++) {
                    if (Object.keys(marker.dataSource[dataIndex])[i].toLowerCase() !== 'text' && Object.keys(marker.dataSource[dataIndex])[i].toLowerCase() !== 'longitude'
                        && Object.keys(marker.dataSource[dataIndex])[i].toLowerCase() !== 'latitude' && Object.keys(marker.dataSource[dataIndex])[i].toLowerCase() !== 'blazortemplateid' 
                        && Object.keys(marker.dataSource[dataIndex])[i].toLowerCase() !== 'name') {
                        data1['text'] = text;
                        text[j] = marker.dataSource[dataIndex][Object.keys(marker.dataSource[dataIndex])[i].toLowerCase()];                                    
                        j++;
                    }
                }
                marker.dataSource[dataIndex]['text'] = data1['text'];            
            }
            let lng: number = (!isNullOrUndefined(marker.longitudeValuePath)) ?
          Number(getValueFromObject(marker.dataSource[dataIndex], marker.longitudeValuePath)) :
          !isNullOrUndefined(marker.dataSource[dataIndex]['longitude']) ? parseFloat(marker.dataSource[dataIndex]['longitude']) :
          !isNullOrUndefined(marker.dataSource[dataIndex]['Latitude']) ? parseFloat(marker.dataSource[dataIndex]['Latitude']) : 0;
          let lat: number = (!isNullOrUndefined(marker.latitudeValuePath)) ?
          Number(getValueFromObject(marker.dataSource[dataIndex], marker.latitudeValuePath)) :
          !isNullOrUndefined(marker.dataSource[dataIndex]['latitude']) ? parseFloat(marker.dataSource[dataIndex]['latitude']) :
          !isNullOrUndefined(marker.dataSource[dataIndex]['Latitude']) ? parseFloat(marker.dataSource[dataIndex]['Latitude']) : 0;
            let duration: number = this.currentLayer.animationDuration;
            let location: Point = (this.maps.isTileMap) ? convertTileLatLongToPoint(
                new Point(lng, lat), this.maps.tileZoomLevel, this.maps.tileTranslatePoint, true
            ) : convertGeoToPoint(lat, lng, factor, layer, this.maps);
            if (this.maps.isTileMap) {
                if (type === 'Template') {
                    let templateOffset: ClientRect = element.getBoundingClientRect();
                    (<HTMLElement>element).style.left = ((location.x - (templateOffset.width / 2)) + marker.offset.x) + 'px';
                    (<HTMLElement>element).style.top = ((location.y - (templateOffset.height / 2)) + marker.offset.y) + 'px';
                    if(this.maps.layers[this.maps.baseLayerIndex].layerType === 'GoogleStaticMap') {
                        let staticMapOffset : ClientRect = getElementByID(this.maps.element.id + '_StaticGoogleMap').getBoundingClientRect();
                    let staticMapOffsetWidth : number  = 640;
                        if(element['style']['display'] !== 'none') {
                            if((staticMapOffset['x'] > templateOffset['x']  || staticMapOffset['x'] + staticMapOffsetWidth < templateOffset['x'] + templateOffset['width'])
                            && (staticMapOffset['y'] > templateOffset['y'] || staticMapOffset['y'] + staticMapOffset['height'] < templateOffset['y'] + templateOffset['height'])
                            ) {
                                element['style']['display'] = 'none';
                            } else if((staticMapOffset['x'] > templateOffset['x'] || staticMapOffset['x'] + staticMapOffsetWidth < templateOffset['x'] + templateOffset['width'])) {
                                element['style']['display'] = 'none';
                            } 
                        }
                    }

                } else {
                    location.x += marker.offset.x;
                    location.y += marker.offset.y;
                    element.setAttribute('transform', 'translate( ' + location.x + ' ' + location.y + ' )');
                }
            } else {
                if (type === 'Template') {
                    location.x = ((Math.abs(this.maps.baseMapRectBounds['min']['x'] - location.x)) * scale);
                    location.y = ((Math.abs(this.maps.baseMapRectBounds['min']['y'] - location.y)) * scale);
                    let layerOffset: ClientRect = getElementByID(this.maps.element.id + '_Layer_Collections').getBoundingClientRect();
                    let elementOffset: ClientRect = element.parentElement.getBoundingClientRect();
                    (<HTMLElement>element).style.left = (((location.x) + (layerOffset.left - elementOffset.left)) + marker.offset.x) + 'px';
                    (<HTMLElement>element).style.top = (((location.y) + (layerOffset.top - elementOffset.top)) + marker.offset.y) + 'px';
                    (<HTMLElement>element).style.transform = 'translate(-50%, -50%)';
                } else {
                    location.x = (((location.x + x) * scale) + marker.offset.x);
                    location.y = (((location.y + y) * scale) + marker.offset.y);
                    if (!animate || duration === 0) {
                        element.setAttribute('transform', 'translate( ' + location.x + ' ' + location.y + ' )');
                    } else {
                        smoothTranslate(element, 0, duration, location);
                    }
                }
            }
        }
    }

    public panning(direction: PanDirection, xDifference: number, yDifference: number, mouseLocation?: PointerEvent | TouchEvent): void {
        let map: Maps = this.maps; let panArgs: IMapPanEventArgs;
        let down: Point = this.mouseDownPoints;
        let move: Point = this.mouseMovePoints;
        let scale: number = map.scale;
        map.markerZoomedState = false;
        map.zoomPersistence = map.enablePersistence;
        map.defaultState = false;
        map.initialCheck = false;
        let translatePoint: Point = map.translatePoint;
        let prevTilePoint: Point = map.tileTranslatePoint;
        let x: number; let y: number;
        xDifference = !isNullOrUndefined(xDifference) ? xDifference : (down.x - move.x);
        yDifference = !isNullOrUndefined(yDifference) ? yDifference : (down.y - move.y);
        if (!map.isTileMap) {
            x = translatePoint.x - xDifference / scale;
            y = translatePoint.y - yDifference / scale;
            let layerRect: ClientRect = getElementByID(map.element.id + '_Layer_Collections').getBoundingClientRect();
            let elementRect: ClientRect = getElementByID(map.element.id + '_svg').getBoundingClientRect();
            let panningXDirection: boolean = ((xDifference < 0 ? layerRect.left <= (elementRect.left + map.mapAreaRect.x) :
                ((layerRect.left + layerRect.width) >= (elementRect.left + elementRect.width) + map.mapAreaRect.x + map.margin.left)));
            let panningYDirection: boolean = ((yDifference < 0 ? layerRect.top <= (elementRect.top + map.mapAreaRect.y) :
                ((layerRect.top + layerRect.height + map.margin.top) >= (elementRect.top + elementRect.height))));
            let location: Object = this.maps.getGeoLocation(this.maps.layersCollection.length - 1, mouseLocation as PointerEvent);
            panArgs = {
                cancel: false, name: pan, maps: !map.isBlazor ? map : null,
                tileTranslatePoint: {}, translatePoint: { previous: translatePoint, current: new Point(x, y) },
                scale: map.scale, tileZoomLevel: map.tileZoomLevel, latitude: location['latitude'], longitude: location['longitude']
            };
            map.trigger(pan, panArgs);
            if (!panArgs.cancel) {
                if (panningXDirection && panningYDirection) {
                    map.translatePoint = new Point(x, y);
                    this.applyTransform();
                } else if (panningXDirection) {
                    map.translatePoint = new Point(x, map.translatePoint.y);
                    this.applyTransform();
                } else if (panningYDirection) {
                    map.translatePoint = new Point(map.translatePoint.x, y);
                    this.applyTransform();
                }
            }            
            this.maps.zoomNotApplied = false;
        } else if (this.maps.tileZoomLevel > 1) {
            x = map.tileTranslatePoint.x - xDifference;
            y = map.tileTranslatePoint.y - yDifference;
            this.distanceX = x - map.tileTranslatePoint.x;
            this.distanceY = y - map.tileTranslatePoint.y;
            map.tileTranslatePoint.x = x;
            map.tileTranslatePoint.y = y;
            if ((map.tileTranslatePoint.y > -10 && yDifference < 0) || ((map.tileTranslatePoint.y < -((Math.pow(2, this.maps.tileZoomLevel)-2) * 256) && yDifference >0))) {
                map.tileTranslatePoint.x = x + xDifference;
                map.tileTranslatePoint.y = y + yDifference;
            }
            map.translatePoint.x = (map.tileTranslatePoint.x - xDifference) / map.scale;
            map.translatePoint.y = (map.tileTranslatePoint.y - yDifference) / map.scale;
            let location: Object = this.maps.getTileGeoLocation(mouseLocation as PointerEvent);
            panArgs = {
                cancel: false, name: pan, maps: !map.isBlazor ? map : null,
                tileTranslatePoint: { previous: prevTilePoint, current: map.tileTranslatePoint },
                translatePoint: { previous: translatePoint, current: map.translatePoint }, scale: map.scale,
                tileZoomLevel: map.tileZoomLevel, latitude: location['latitude'], longitude: location['longitude']
            };
            map.trigger(pan, panArgs);
            map.mapLayerPanel.generateTiles(map.tileZoomLevel, map.tileTranslatePoint, 'Pan');
            this.applyTransform();
        }
        map.zoomTranslatePoint = map.translatePoint;
        this.mouseDownPoints = this.mouseMovePoints;
        this.maps.zoomNotApplied = false;
        this.isSingleClick = false;
    }

    private toAlignSublayer(): void {
        this.maps.translatePoint.x = !isNullOrUndefined(this.distanceX) ? (this.maps.translatePoint.x -
            (this.distanceX / this.maps.scale)) : this.maps.translatePoint.x;
        this.maps.translatePoint.y = !isNullOrUndefined(this.distanceY) ? this.maps.translatePoint.y -
            (this.distanceY / this.maps.scale) : this.maps.translatePoint.y;
        this.applyTransform(false);
    }

    public toolBarZooming(zoomFactor: number, type: string): void {
        let map: Maps = this.maps;
        map.initialCheck = false;
        map.defaultState = ((type === 'Reset' && zoomFactor === 1 && !(map.zoomSettings.resetToInitial && map.applyZoomReset))
            || (type === 'ZoomOut' && zoomFactor === 1));
        let prevLevel: number = map.tileZoomLevel;
        let scale: number = map.previousScale = map.scale;
        map.markerZoomedState = false;
        map.zoomPersistence = map.enablePersistence;
        map.mapScaleValue = zoomFactor;
        let maxZoom: number = map.zoomSettings.maxZoom;
        let minZoom: number = map.zoomSettings.minZoom;
        let size: Rect = map.mapAreaRect;
        let translatePoint: Point = map.previousPoint = map.translatePoint;
        let prevTilePoint: Point = map.tileTranslatePoint;
        map.previousProjection = map.projectionType;
        zoomFactor = (type === 'ZoomOut') ? (Math.round(zoomFactor) === 1 ? 1 : zoomFactor) : zoomFactor;
        zoomFactor = (type === 'Reset') ? 1 : (Math.round(zoomFactor) === 0) ? 1 : zoomFactor;
        zoomFactor = (minZoom > zoomFactor && type === 'ZoomIn') ? minZoom + 1 : zoomFactor;
        let zoomArgs: IMapZoomEventArgs;
        if ((!map.isTileMap) && (type === 'ZoomIn' ? zoomFactor >= minZoom && zoomFactor <= maxZoom : zoomFactor >= minZoom 
        || map.isReset)) {
            let min: Object = map.baseMapRectBounds['min'] as Object;
            let max: Object = map.baseMapRectBounds['max'] as Object;
            let mapWidth: number = Math.abs(max['x'] - min['x']);
            let mapHeight: number = Math.abs(min['y'] - max['y']);
            let translatePointX: number = translatePoint.x - (((size.width / scale) - (size.width / zoomFactor)) / 2);
            let translatePointY: number = translatePoint.y - (((size.height / scale) - (size.height / zoomFactor)) / 2);
            let currentHeight: number = Math.abs(map.baseMapRectBounds['max']['y'] - map.baseMapRectBounds['min']['y']) * zoomFactor;
            translatePointX = (currentHeight < map.mapAreaRect.height) ? (size.x + ((-(min['x'])) + ((size.width / 2) - (mapWidth / 2))))
                : translatePointX;
            translatePointY = (currentHeight < map.mapAreaRect.height) ? (size.y + ((-(min['y'])) + ((size.height / 2) - (mapHeight / 2))))
                : translatePointY;
            map.translatePoint = new Point(translatePointX, translatePointY);
            map.zoomTranslatePoint = map.translatePoint;
            map.scale = zoomFactor;
            this.triggerZoomEvent(prevTilePoint, prevLevel, type);
            this.applyTransform(true);
        } else if ((map.isTileMap) && ((zoomFactor >= minZoom && zoomFactor <= maxZoom) || map.isReset)) {
          let tileZoomFactor: number = prevLevel < minZoom && !map.isReset ? minZoom : zoomFactor;
            map.scale = Math.pow(2, tileZoomFactor - 1);
            map.tileZoomLevel = tileZoomFactor;
            map.zoomSettings.zoomFactor = zoomFactor;
            let position: Point = { x: map.availableSize.width / 2, y: map.availableSize.height / 2 };
            this.getTileTranslatePosition(prevLevel, tileZoomFactor, position, type);
            if (map.zoomSettings.resetToInitial && map.applyZoomReset && type === 'Reset' || (type === 'ZoomOut' && map.zoomSettings.resetToInitial && map.applyZoomReset && tileZoomFactor <= map.initialZoomLevel)) {
                map.initialCheck = true;
                map.zoomPersistence = false;
                map.tileTranslatePoint.x = map.initialTileTranslate.x;
                map.tileTranslatePoint.y = map.initialTileTranslate.y;
                tileZoomFactor = map.tileZoomLevel = map.mapScaleValue = map.initialZoomLevel;
            }
            this.triggerZoomEvent(prevTilePoint, prevLevel, type);
            map.translatePoint.y = (map.tileTranslatePoint.y - (0.01 * map.mapScaleValue)) / map.scale;
            map.translatePoint.x = (map.tileTranslatePoint.x - (0.01 * map.mapScaleValue)) / map.scale;
            if (document.getElementById(this.maps.element.id + '_LayerIndex_1')) {
                document.getElementById(this.maps.element.id + '_LayerIndex_1').style.display = 'none';
            }
            if (document.querySelector('.GroupElement')) {
                (document.querySelector('.GroupElement') as HTMLElement).style.display = 'none';
            }
            map.mapLayerPanel.generateTiles(tileZoomFactor, map.tileTranslatePoint, type);
            let element1: HTMLElement = document.getElementById(this.maps.element.id + '_tiles');
            setTimeout(() => {
                if (type === 'ZoomOut' || type === "Reset") {
                    // element1.removeChild(element1.children[element1.childElementCount - 1]);
                    // element1.childElementCount ? element1.removeChild(element1.children[element1.childElementCount - 1]) : element1;
                }
                this.applyTransform(true);
                if (document.getElementById(this.maps.element.id + '_LayerIndex_1')) {
                    document.getElementById(this.maps.element.id + '_LayerIndex_1').style.display = 'block';
                }
            }, 250);
        }
        this.maps.zoomNotApplied = false;
    }

    /* tslint:disable:max-func-body-length */
    public createZoomingToolbars(): void {
        let map: Maps = this.maps;
        this.toolBarGroup = map.renderer.createGroup({
            id: map.element.id + '_Zooming_KitCollection',
            opacity: 0.3,
        });
        let kitHeight: number = 16; let kitWidth: number = 16;
        let xSpacing: number = 15; let ySpacing: number = 15;
        let padding: number = 20;
        let orientation: Orientation = map.zoomSettings.toolBarOrientation;
        let toolbarsCollection: string[] = map.zoomSettings.toolbars;
        let shadowElement: string = '<filter id="chart_shadow" height="130%"><feGaussianBlur in="SourceAlpha" stdDeviation="5"/>';
        shadowElement += '<feOffset dx="-3" dy="4" result="offsetblur"/><feComponentTransfer><feFuncA type="linear" slope="1"/>';
        shadowElement += '</feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
        let toolBarLength: number = map.zoomSettings.toolbars.length;
        let toolWidth: number = (map.zoomSettings.toolBarOrientation === 'Horizontal') ? (toolBarLength * kitWidth) + (toolBarLength * padding) : (kitWidth * 2);
        let toolHeight: number = (map.zoomSettings.toolBarOrientation === 'Horizontal') ? (kitHeight * 2) : (toolBarLength * kitHeight) + (toolBarLength * padding);
        this.toolBarGroup.appendChild(map.renderer.drawRectangle(new RectOption(
            map.element.id + '_Zooming_Rect', 'transparent', { color: 'transparent', width: 1 },
            1, new Rect(0, 0, toolWidth, toolHeight), 0, 0
        )) as SVGRectElement);
        let defElement: Element = map.renderer.createDefs();
        defElement.innerHTML = shadowElement;
        this.toolBarGroup.appendChild(defElement);
        let outerElement: Element = map.renderer.drawRectangle(new RectOption(
            map.element.id + '_Zooming_Rect', 'transparent', { color: 'transparent', width: 1 },
            0.1, new Rect(0, 0, toolWidth, toolHeight), 0, 0
        ));
        outerElement.setAttribute('filter', 'url(#chart_shadow)');
        this.toolBarGroup.appendChild(outerElement);
        let performFunction: Function;
        for (let i: number = 0; i < toolbarsCollection.length; i++) {
            let toolbar: string = toolbarsCollection[i];
            let pathOptions: PathOption; let polyOptions: PolygonOption;
            this.currentToolbarEle = map.renderer.createGroup({
                id: map.element.id + '_Zooming_ToolBar_' + toolbar + '_Group',
                transform: 'translate( ' + xSpacing + ' ' + ySpacing + ' ) '
            });
            this.currentToolbarEle.setAttribute('class', 'e-maps-toolbar');
            let fillColor: string = '';
            let fill: string = 'transparent';
            let direction: string = ''; let polygonDirection: string = '';
            switch (toolbar.toLowerCase()) {
                case 'zoom':
                    let fillColor: string;
                    let strokeColor: string;
                    direction = 'M0.001,14.629L1.372,16l4.571-4.571v-0.685l0.228-0.274c1.051,0.868,2.423,1.417,3.885,1.417c3.291,0,';
                    direction += '5.943-2.651,5.943-5.943S13.395,0,10.103,0S4.16,2.651,4.16,5.943c0,1.508,0.503,2.834,1.417,3.885l-0.274,0.228H4.571';
                    direction = direction + 'L0.001,14.629L0.001,14.629z M5.943,5.943c0-2.285,1.828-4.114,4.114-4.114s4.114,1.828,4.114,';
                    if (this.maps.zoomSettings.enablePanning && !this.maps.zoomSettings.enableSelectionZooming) {
                        fillColor = fill;
                        strokeColor = this.maps.themeStyle.zoomFillColor;
                    } else if (this.maps.zoomSettings.enablePanning && this.maps.zoomSettings.enableSelectionZooming){
                        fillColor = fill;
                        strokeColor = this.maps.themeStyle.zoomFillColor;                           
                    } else if (!this.maps.zoomSettings.enablePanning && !this.maps.zoomSettings.enableSelectionZooming) {
                        fillColor = fill;
                        strokeColor = this.maps.themeStyle.zoomFillColor;
                    } else {
                        fillColor = this.selectionColor;
                        strokeColor = this.selectionColor;
                    }
                    this.currentToolbarEle.appendChild(map.renderer.drawPath(new PathOption(
                        map.element.id + '_Zooming_ToolBar_' + toolbar, fillColor, 1, strokeColor, 1, null,
                        direction + '4.114s-1.828,4.114-4.114,4.114S5.943,8.229,5.943,5.943z')
                    ) as SVGPathElement);
                    this.zoomElements = this.currentToolbarEle;
                    this.wireEvents(this.currentToolbarEle, this.performToolBarAction);
                    break;
                case 'zoomin':
                    direction = 'M 8, 0 L 8, 16 M 0, 8 L 16, 8';
                    this.currentToolbarEle.appendChild(map.renderer.drawPath(new PathOption(
                        map.element.id + '_Zooming_ToolBar_' + toolbar + '_Path', fill, 3, this.maps.themeStyle.zoomFillColor, 1, null, direction)
                    ) as SVGPathElement);
                    this.zoomInElements = this.currentToolbarEle;
                    this.wireEvents(this.currentToolbarEle, this.performToolBarAction);
                    break;
                case 'zoomout':
                    direction = 'M 0, 8 L 16, 8';
                    this.currentToolbarEle.appendChild(map.renderer.drawPath(new PathOption(
                        map.element.id + '_Zooming_ToolBar_' + toolbar, fill, 3, this.maps.themeStyle.zoomFillColor, 1, null, direction)
                    ) as SVGPathElement);
                    this.zoomOutElements = this.currentToolbarEle;
                    this.wireEvents(this.currentToolbarEle, this.performToolBarAction);
                    break;
                case 'pan':
                    let color: string;
                    direction = 'M5,3h2.3L7.275,5.875h1.4L8.65,3H11L8,0L5,3z M3,11V8.7l2.875,0.025v-1.4L3,7.35V5L0,8L3,';
                    direction += '11z M11,13H8.7l0.025-2.875h-1.4L7.35,13H5l3,3L11,13z M13,5v2.3l-2.875-0.025v1.4L13,8.65V11l3-3L13,5z';
                    if (this.maps.zoomSettings.enablePanning && this.maps.zoomModule.isDragZoom) {
                        color = "#737373";
                    } else if (!this.maps.zoomSettings.enablePanning) {
                        color = "#737373";
                        this.currentToolbarEle.setAttribute('class', '');
                    } else {
                        color = this.selectionColor;
                    }
                    this.currentToolbarEle.appendChild(map.renderer.drawPath(new PathOption(
                        map.element.id + '_Zooming_ToolBar_' + toolbar, color, 1, color, 1, null,
                        direction)
                    ) as SVGPathElement);
                    this.panColor = color;
                    this.panElements = this.currentToolbarEle;
                    this.wireEvents(this.currentToolbarEle, this.performToolBarAction);
                    break;
                case 'reset':
                    direction = 'M12.364,8h-2.182l2.909,3.25L16,8h-2.182c0-3.575-2.618-6.5-5.818-6.5c-1.128,0-2.218,0.366-3.091,';
                    direction += '1.016l1.055,1.178C6.581,3.328,7.272,3.125,8,3.125C10.4,3.125,12.363,5.319,12.364,8L12.364,8z M11.091,';
                    direction += '13.484l-1.055-1.178C9.419,12.672,8.728,12.875,8,12.875c-2.4,0-4.364-2.194-4.364-4.875h2.182L2.909,4.75L0,8h2.182c0,';
                    this.currentToolbarEle.appendChild(map.renderer.drawPath(new PathOption(
                        map.element.id + '_Zooming_ToolBar_' + toolbar, this.fillColor, null, this.maps.themeStyle.zoomFillColor,
                        1, null, direction + '3.575,2.618,6.5,5.818,6.5C9.128,14.5,10.219,14.134,11.091,13.484L11.091,13.484z')
                    ) as HTMLElement);
                    this.wireEvents(this.currentToolbarEle, this.performToolBarAction);
                    break;
            }
            this.currentToolbarEle.appendChild(map.renderer.drawCircle(
                new CircleOption(map.element.id + '_Zooming_ToolBar_' + toolbar + '_Rect', fill, { color: this.maps.themeStyle.zoomFillColor, width: 1 }, 1, 8, 8, 16, '')
            ) as SVGRectElement);
            xSpacing = (orientation === 'Horizontal') ? (xSpacing + (kitWidth + padding)) : xSpacing;
            ySpacing = (orientation === 'Horizontal') ? ySpacing : (ySpacing + (kitHeight + padding));
            this.toolBarGroup.appendChild(this.currentToolbarEle);
        }
    }

    public performToolBarAction(e: PointerEvent): void {
        let target: Element = <Element>e.target;
        e.stopImmediatePropagation();
        let isTouch: boolean = e.pointerType === 'touch' || e.pointerType === '2' || (e.type.indexOf('touch') > -1);
        let toolbar: string = target.id.split('_Zooming_ToolBar_')[1].split('_')[0];
        if (isTouch) {
            this.handled = true;
            this.performZoomingByToolBar(toolbar);
        } else if ((e.type === 'mousedown' || e.type === 'pointerdown') && !this.handled) {
            this.handled = false;
            this.performZoomingByToolBar(toolbar);
        } else {
            this.handled = false;
        }
    }

    /**
     *
     * @private
     */
    public performZoomingByToolBar(type: string): void {
        let map: Maps = this.maps;
        map.isReset = false;
        switch (type.toLowerCase()) {
            case 'zoom':
                this.panColor = this.fillColor;
                this.zoomColor = this.selectionColor;
                this.applySelection(this.zoomElements, this.selectionColor);
                this.applySelection(this.panElements, this.fillColor);
                break;
            case 'pan':
                if (!this.maps.zoomSettings.enablePanning) {
                    this.panColor = '#737373';
                }
                else {
                    this.panColor = this.selectionColor;
                }
                this.zoomColor = this.fillColor;
                if (!this.maps.zoomSettings.enablePanning) {
                    this.applySelection(this.zoomElements, this.selectionColor);
                    this.applySelection(this.panElements, this.panColor);
                }
                else {
                    this.applySelection(this.zoomElements, this.fillColor);
                    this.applySelection(this.panElements, this.panColor);
                }
                break;
            case 'zoomin':
                map.staticMapZoom = map.tileZoomLevel;
                if (map.staticMapZoom > 0 && map.staticMapZoom < 22) {
                    map.staticMapZoom += 1
                }
                this.toolBarZooming((map.isTileMap ? map.tileZoomLevel : map.scale) + 1, 'ZoomIn');
                break;
            case 'zoomout':
            map.staticMapZoom = map.tileZoomLevel;
                map.markerCenterLatitude = null;
                map.markerCenterLongitude = null;
                this.toolBarZooming((map.isTileMap ? map.tileZoomLevel : map.scale) - 1, 'ZoomOut');
                break;
            case 'reset':
                map.staticMapZoom = map.zoomSettings.enable ? map.zoomSettings.zoomFactor : 0;
                map.markerCenterLatitude = null;
                map.markerCenterLongitude = null;
                this.toolBarZooming(1, 'Reset');
                if (!this.maps.zoomSettings.enablePanning) {
                    this.applySelection(this.zoomElements, this.selectionColor);
                    this.applySelection(this.panElements, '#737373');
                } else {
                    this.applySelection(this.zoomElements, this.fillColor);
                    this.applySelection(this.panElements, this.selectionColor);
                }
        }
        this.panningStyle(type.toLowerCase());
    }

    private panningStyle(toolbar: string): void {
        let svg: Element = getElementByID(this.maps.element.id + '_svg');
        if (toolbar === 'pan' || this.isPanning) {
            svg.setAttribute('class', 'e-maps-panning');
        } else {
            svg.setAttribute('class', '');
        }
    }
    private applySelection(elements: Element, color: string): void {
        if (!elements) {
            return;
        }
        let childElement: HTMLElement;
        for (let i: number = 0; i < elements.childElementCount; i++) {
            childElement = elements.childNodes[i] as HTMLElement;
            if (childElement.tagName !== 'circle') {
                childElement.setAttribute('fill', color);
                childElement.setAttribute('stroke', color);
            }
        }
    }

    public showTooltip(e: PointerEvent): void {
        let text: string = (<Element>e.target).id.split('_Zooming_ToolBar_')[1].split('_')[0];
        if (!this.isTouch) {
            createTooltip('EJ2_Map_Toolbar_Tip', this.maps.getLocalizedLabel(text), (e.pageY + 10), (e.pageX + 10), '10px');
        }
    }

    public removeTooltip(): void {
        if (getElementByID('EJ2_Map_Toolbar_Tip')) {
            remove(getElementByID('EJ2_Map_Toolbar_Tip'));
        }
    }
    public alignToolBar(): void {
        let map: Maps = this.maps;
        let padding: number = 10;
        let element: HTMLElement = createElement('div', { id: map.element.id + '_ToolBar', styles: 'position:absolute;z-index:2' });
        let rectSVGObject: Element = map.renderer.createSvg({
            id: map.element.id + '_Zooming_ToolBar', width: 10, height: 10,
        });
        rectSVGObject.appendChild(this.toolBarGroup);
        element.appendChild(rectSVGObject);
        if (getElementByID(map.element.id + '_Secondary_Element')) {
            getElementByID(map.element.id + '_Secondary_Element').appendChild(element);
        }
        let toolBarSize: ClientRect = this.toolBarGroup.getBoundingClientRect();
        rectSVGObject.setAttribute('height', (toolBarSize.height + padding / 2).toString());
        rectSVGObject.setAttribute('width', (toolBarSize.width + padding / 2).toString());
        let size: Rect = !isNullOrUndefined(map.totalRect) ? map.totalRect : map.mapAreaRect;
        let x: number = 0; let y: number = 0;
        switch (map.zoomSettings.verticalAlignment) {
            case 'Near':
                y = size.y;
                break;
            case 'Center':
                y = (size.height / 2) - (toolBarSize.height / 2);
                break;
            case 'Far':
                y = (size.height - toolBarSize.height) - padding;
                break;
        }
        switch (map.zoomSettings.horizontalAlignment) {
            case 'Near':
                x = size.x;
                break;
            case 'Center':
                x = (size.width / 2) - (toolBarSize.width / 2);
                break;
            case 'Far':
                x = (size.width - toolBarSize.width) - padding;
                break;
        }
        element.style.left = x + 'px';
        element.style.top = y + 'px';
        let color: string = this.maps.zoomSettings.highlightColor;
        let css: string = ' .e-maps-toolbar:hover > circle { stroke:' + color + '; } .e-maps-toolbar:hover > path { fill: ' + color + ' ;  stroke: ' + color + '; }' +
            '.e-maps-toolbar:hover { cursor: pointer; } .e-maps-cursor-disable:hover { cursor: not-allowed; } .e-maps-panning:hover { cursor: pointer; } ' +
            '.e-maps-popup-close { display: block; opacity: 0; }';
        let style: HTMLStyleElement = document.createElement('style');
        style.appendChild(document.createTextNode(css));
        element.appendChild(style);
    }

    /**
     * To bind events.
     * @return {void}
     * @private
     */
    public wireEvents(element: Element, process: Function): void {
        EventHandler.add(element, Browser.touchStartEvent, process, this);
        EventHandler.add(element, 'mouseover', this.showTooltip, this);
        EventHandler.add(element, 'mouseout', this.removeTooltip, this);
    }

    public mapMouseWheel(e: WheelEvent): void {
        if (this.maps.zoomSettings.enable && this.maps.zoomSettings.mouseWheelZoom) {
            let map: Maps = this.maps;
            let size: Size = map.availableSize;
            map.markerZoomedState = false;
            map.zoomPersistence = map.enablePersistence;
            let position: Point = this.getMousePosition(e.pageX, e.pageY);
            let prevLevel: number = map.tileZoomLevel;
            let prevScale: number = map.scale;
            let delta: number = 1; 
            let staticMaxZoomLevel : number = 22; // google map maximum zoom level value
            let value: number = (map.isTileMap) ? prevLevel : prevScale;
            if (((position.x > map.mapAreaRect.x) && (position.x < (map.mapAreaRect.x + map.mapAreaRect.width))) &&
                (position.y > map.mapAreaRect.y) && position.y < (map.mapAreaRect.y + map.mapAreaRect.height)) {
                e.preventDefault();
                let direction: string = (this.browserName === 'mozilla' && !this.isPointer) ?
                    -(e.detail) / 3 > 0 ? 'ZoomIn' : 'ZoomOut' : (e.wheelDelta / 120) > 0 ? 'ZoomIn' : 'ZoomOut';
                if (direction === 'ZoomIn') {
                    map.mapScaleValue = value + delta;
                    map.staticMapZoom = map.tileZoomLevel;
                    if (map.staticMapZoom > 0 && map.staticMapZoom < staticMaxZoomLevel) {
                        map.staticMapZoom += 1
                    }
                    this.performZooming(position, (value + delta), direction);
                } else {
                    map.mapScaleValue = value - delta;
                    map.staticMapZoom = map.tileZoomLevel;
                    if (map.mapScaleValue === 1) {
                        map.markerCenterLatitude = null;
                        map.markerCenterLongitude = null;
                    }
                    if (map.staticMapZoom > 1 && map.staticMapZoom < staticMaxZoomLevel) {
                        map.staticMapZoom -= 1
                    }
                    this.performZooming(position, (value - delta), direction);
                }
            }
        }
    }

    public doubleClick(e: PointerEvent): void {
        let pageX: number = e.pageX;
        let pageY: number = e.pageY;
        let target: Element = <Element>(<PointerEvent>e).target;
        if (this.maps.zoomSettings.enable && this.maps.zoomSettings.doubleClickZoom
            && !(e.target['id'].indexOf('_Zooming_') > -1)) {
            let position: Point = this.getMousePosition(pageX, pageY);
            let map: Maps = this.maps;
            let size: Size = map.availableSize;
            let prevLevel: number = map.tileZoomLevel;
            let prevScale: number = map.scale;
            map.mapScaleValue = map.mapScaleValue + 1;
            let value: number = (map.isTileMap) ? prevLevel : prevScale;
            if (((position.x > map.mapAreaRect.x) && (position.x < (map.mapAreaRect.x + map.mapAreaRect.width))) &&
                (position.y > map.mapAreaRect.y) && position.y < (map.mapAreaRect.y + map.mapAreaRect.height)) {
                this.performZooming(position, (value + 1), 'ZoomIn');
            }
        }
    }

    public mouseDownHandler(e: PointerEvent | TouchEvent): void {
        let pageX: number;
        let pageY: number;
        let target: Element;
        let touches: TouchList = null;
        let element: Element = <Element>e.target;
        if (e.type === 'touchstart') {
            this.isTouch = true;
            touches = (<TouchEvent & PointerEvent>e).touches;
            target = <Element>(<TouchEvent & PointerEvent>e).target;
            pageX = touches[0].clientX;
            pageY = touches[0].clientY;
        } else {
            pageX = (<PointerEvent>e).pageX;
            pageY = (<PointerEvent>e).pageY;
            target = <Element>e.target;
        }
        if (!this.maps.zoomSettings.enablePanning) {
            this.isPanning = this.panColor !== this.selectionColor ? this.maps.zoomSettings.enablePanning 
                : this.zoomColor === this.selectionColor;
        } else {
            this.isPanning = this.panColor === this.selectionColor ? this.maps.zoomSettings.enablePanning 
                : this.zoomColor !== this.selectionColor;
        }
        this.mouseDownLatLong = { x: pageX, y: pageY };
        this.rectZoomingStart = ((!this.isPanning) && this.maps.zoomSettings.enable);
        this.mouseDownPoints = this.getMousePosition(pageX, pageY);
        if (this.isTouch) {
            this.firstMove = true;
            this.pinchFactor = this.maps.scale;
            this.fingers = touches.length;
        }
        this.isSingleClick = true;
    }

    public mouseMoveHandler(e: PointerEvent | TouchEvent): void {
        let pageX: number;
        let pageY: number;
        let map: Maps = this.maps;
        let touchArg: TouchEvent;
        let target: Element;
        let touches: TouchList = null;
        let zoom: ZoomSettings = <ZoomSettings>this.maps.zoomSettings;
        if (e.type === 'touchmove') {
            this.isTouch = true;
            target = <Element>(<TouchEvent & PointerEvent>e).target;
            touches = (<TouchEvent & PointerEvent>e).touches;
            pageX = touches[0].clientX;
            pageY = touches[0].clientY;
        } else {
            pageX = (<PointerEvent>e).pageX;
            pageY = (<PointerEvent>e).pageY;
            target = <Element>e.target;
        }
        if (getElementByID(map.element.id + '_Zooming_KitCollection')) {
            if (target.id.indexOf('_Zooming_') > -1) {
                getElementByID(map.element.id + '_Zooming_KitCollection').setAttribute('opacity', '1');
                if (document.getElementById(map.element.id + '_Zooming_ToolBar_Pan_Group')) {
                    if (!this.maps.zoomSettings.enablePanning) {
                        if (target.id.indexOf('_Zooming_ToolBar') > -1 || target.id.indexOf('_Zooming_Rect') > -1) {
                            getElementByID(map.element.id + '_Zooming_ToolBar_Pan_Rect').setAttribute('opacity', '0.3');
                            getElementByID(map.element.id + '_Zooming_ToolBar_Pan').setAttribute('opacity', '0.3');
                        }
                    }
                }                   
            }
            else {
                getElementByID(map.element.id + '_Zooming_KitCollection').setAttribute('opacity', '0.3');
                if (!this.maps.zoomSettings.enablePanning && document.getElementById(map.element.id + '_Zooming_ToolBar_Pan_Group')) {
                    getElementByID(map.element.id + '_Zooming_ToolBar_Pan_Rect').setAttribute('opacity', '1');
                    getElementByID(map.element.id + '_Zooming_ToolBar_Pan').setAttribute('opacity', '1');
                }                    
            }
        }
        if (this.isTouch) {
            if (this.maps.zoomSettings.pinchZooming) {
                if (this.firstMove && touches.length === 2) {
                    this.rectZoomingStart = false;
                    this.updateInteraction();
                    this.touchStartList = targetTouches(e);
                } else if (touches.length === 2 && this.touchStartList.length === 2) {
                    this.touchMoveList = targetTouches(e);
                    e.preventDefault();
                    this.rectZoomingStart = false;
                    this.performPinchZooming(<PointerEvent>e);
                }
                this.firstMove = false;
            }
        }
        this.mouseMovePoints = this.getMousePosition(pageX, pageY);
        let targetId: string = e.target['id'];
        let targetEle: Element = <Element>e.target;
        if (zoom.enable && this.isPanning && ((Browser.isDevice && touches.length >= 1) || !Browser.isDevice)) {
            e.preventDefault();
            this.maps.element.style.cursor = 'pointer';
            this.mouseMoveLatLong = { x: pageX, y: pageY };
            if ((this.mouseDownLatLong['x'] !== this.mouseMoveLatLong['x']) && (this.mouseDownLatLong['y'] !== this.mouseMoveLatLong['y'])) {
                if (this.maps.zoomSettings.enablePanning) {
                    this.panning('None', null, null, e);
                }
                this.mouseDownLatLong['x'] = pageX;
                this.mouseDownLatLong['y'] = pageY;
            }
        }
        if (this.isTouch ? (touches.length === 1 && this.rectZoomingStart) : this.rectZoomingStart) {
            e.preventDefault();
            if (this.maps.zoomSettings.enableSelectionZooming) {
                this.drawZoomRectangle();
            }
        }
    }

    public mouseUpHandler(e: PointerEvent | TouchEvent): void {
        let isDragZoom: boolean;
        let map: Maps = this.maps;
        this.rectZoomingStart = false;
        this.isPanning = false;
        this.isSingleClick = this.isSingleClick ? true : false;
        this.isTouch = false;
        this.touchStartList = [];
        this.touchMoveList = [];
        this.lastScale = 1;
        this.maps.element.style.cursor = 'auto';
        if ((!isNullOrUndefined(this.distanceX) || !isNullOrUndefined(this.distanceY)) && (!isNullOrUndefined(this.currentLayer) && this.currentLayer.type === 'SubLayer')) {
            this.toAlignSublayer();
            this.distanceX = this.distanceY = null;
        }
        let zoomRectElement: HTMLElement = <HTMLElement>getElementByID(this.maps.element.id + '_Selection_Rect_Zooming');
        if (zoomRectElement && this.maps.zoomSettings.enable && this.maps.zoomSettings.enableSelectionZooming) {
            isDragZoom = true;
            remove(zoomRectElement);
            this.performRectZooming();
        }
        this.mouseMoveLatLong = { x: 0, y: 0 };
        this.mouseDownLatLong = { x: 0, y: 0 };
    }

    public mouseCancelHandler(e: PointerEvent): void {
        this.isPanning = false;
        this.isTouch = false;
        this.rectZoomingStart = false;
        let zoomRectElement: HTMLElement = <HTMLElement>getElementByID(this.maps.element.id + '_Selection_Rect_Zooming');
        if (zoomRectElement && this.maps.zoomSettings.enable) {
            remove(zoomRectElement);
            this.performRectZooming();
        }
    }
    /**
     * To handle the click event for maps.
     * @param e
     */
    public click(e: PointerEvent): void {
        let map: Maps = this.maps;
        if ((map.markerModule && map.markerModule.sameMarkerData.length > 0) ||
            (e.target['id'].indexOf('MarkerIndex') > -1 && e.target['id'].indexOf('cluster') == -1)) {
            return null;
        }
        if (this.isSingleClick && map.zoomSettings.zoomOnClick && !(e.target['id'].indexOf('_Zooming_') > -1) && !map.zoomSettings.doubleClickZoom
            && (this.zoomColor !== this.selectionColor)) {
            let pageX: number = e.pageX;
            let pageY: number = e.pageY;
            let position: Point = this.getMousePosition(pageX, pageY);
            let prevLevel: number = map.tileZoomLevel;
            let prevScale: number = map.scale;
            map.mapScaleValue = map.mapScaleValue + 1;
            let value: number = (map.isTileMap) ? prevLevel : prevScale;
            if (((position.x > map.mapAreaRect.x) && (position.x < (map.mapAreaRect.x + map.mapAreaRect.width))) &&
                (position.y > map.mapAreaRect.y) && position.y < (map.mapAreaRect.y + map.mapAreaRect.height)) {
                this.performZooming(position, (value + 1), 'ZoomIn');
            }
        }
    }

    public getMousePosition(pageX: number, pageY: number): Point {
        let map: Maps = this.maps;
        let elementRect: ClientRect = map.element.getBoundingClientRect();
        let pageXOffset: number = map.element.ownerDocument.defaultView.pageXOffset;
        let pageYOffset: number = map.element.ownerDocument.defaultView.pageYOffset;
        let clientTop: number = map.element.ownerDocument.documentElement.clientTop;
        let clientLeft: number = map.element.ownerDocument.documentElement.clientLeft;
        let positionX: number = elementRect.left + pageXOffset - clientLeft;
        let positionY: number = elementRect.top + pageYOffset - clientTop;
        return new Point(Math.abs(pageX - positionX), Math.abs(pageY - positionY));
    }

    public addEventListener(): void {
        if (this.maps.isDestroyed) {
            return;
        }
        EventHandler.add(this.maps.element, this.wheelEvent, this.mapMouseWheel, this);
        EventHandler.add(this.maps.element, 'click', this.click, this);
        EventHandler.add(this.maps.element, 'dblclick', this.doubleClick, this);
        this.maps.on(Browser.touchMoveEvent, this.mouseMoveHandler, this);
        this.maps.on(Browser.touchStartEvent, this.mouseDownHandler, this);
        this.maps.on(Browser.touchEndEvent, this.mouseUpHandler, this);
        EventHandler.add(this.maps.element, this.cancelEvent, this.mouseCancelHandler, this);
    }

    public removeEventListener(): void {
        if (this.maps.isDestroyed) {
            return;
        }
        EventHandler.remove(this.maps.element, this.wheelEvent, this.mapMouseWheel);
        EventHandler.remove(this.maps.element, 'click', this.click);
        EventHandler.remove(this.maps.element, 'dblclick', this.doubleClick);
        this.maps.off(Browser.touchMoveEvent, this.mouseMoveHandler);
        this.maps.off(Browser.touchStartEvent, this.mouseDownHandler);
        this.maps.off(Browser.touchEndEvent, this.mouseUpHandler);
        this.maps.off(this.cancelEvent, this.mouseCancelHandler);
    }

    /**
     * Get module name.
     */
    protected getModuleName(): string {
        return 'Zoom';
    }

    /**
     * To destroy the zoom.
     * @return {void}
     * @private
     */
    public destroy(maps: Maps): void {
        this.removeEventListener();
        /**
         * Destroy method performed here
         */
    }
}

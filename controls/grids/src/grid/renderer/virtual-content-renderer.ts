import { remove, createElement, closest, formatUnit, Browser, KeyboardEventArgs, extend } from '@syncfusion/ej2-base';
import { isNullOrUndefined, removeClass } from '@syncfusion/ej2-base';
import { DataManager } from '@syncfusion/ej2-data';
import { IGrid, IRenderer, NotifyArgs, VirtualInfo, IModelGenerator, InterSection, RowSelectEventArgs } from '../base/interface';
import { Column } from '../models/column';
import { Row } from '../models/row';
import { dataReady, modelChanged, refreshVirtualBlock, contentReady } from '../base/constant';
import * as events from '../base/constant';
import { SentinelType, Offsets } from '../base/type';
import { RenderType, freezeMode } from '../base/enum';
import { ContentRender } from './content-renderer';
import { HeaderRender } from './header-renderer';
import { ServiceLocator } from '../services/service-locator';
import { InterSectionObserver } from '../services/intersection-observer';
import { RendererFactory } from '../services/renderer-factory';
import { VirtualRowModelGenerator } from '../services/virtual-row-model-generator';
import { isGroupAdaptive, ensureLastRow, ensureFirstRow, getEditedDataIndex, getTransformValues, resetRowObjectIndex } from '../base/util';
import { isBlazor, setStyleAttribute } from '@syncfusion/ej2-base';
import { Grid } from '../base/grid';
/**
 * VirtualContentRenderer
 * @hidden
 */
export class VirtualContentRenderer extends ContentRender implements IRenderer {
    private count: number;
    private maxPage: number;
    private maxBlock: number;
    private prevHeight: number = 0;
    /** @hidden */
    public observer: InterSectionObserver;
    /**
     * @hidden
     */
    public vgenerator: VirtualRowModelGenerator;
    /** @hidden */
    public header: VirtualHeaderRenderer;
    /** @hidden */
    public startIndex: number = 0;
    private preStartIndex: number = 0;
    private preEndIndex: number;
    /** @hidden */
    public startColIndex: number;
    /** @hidden */
    public endColIndex: number;
    private locator: ServiceLocator;
    private preventEvent: boolean = false;
    private actions: string[] = ['filtering', 'searching', 'grouping', 'ungrouping'];
    /** @hidden */
    public content: HTMLElement;
    /** @hidden */
    public movableContent: HTMLElement;
    /** @hidden */
    public offsets: { [x: number]: number } = {};
    private tmpOffsets: { [x: number]: number } = {};
    /** @hidden */
    public virtualEle: VirtualElementHandler = new VirtualElementHandler();
    private offsetKeys: string[] = [];
    private isFocused: boolean = false;
    private isSelection: boolean = false;
    private selectedRowIndex: number;
    private isBottom: boolean = false;
    private rndrCount: number = 0;
    /** @hidden */
    public activeKey: string;
    /** @hidden */
    public rowIndex: number;
    /** @hidden */
    public blzRowIndex: number;
    /** @hidden */
    public blazorDataLoad: boolean;
    private cellIndex: number;
    private empty: string | number | Element = undefined;
    private isAdd: boolean;
    private isCancel: boolean = false;
    /** @hidden */
    public requestType: string;
    private editedRowIndex: number;
    private requestTypes: string[] = ['beginEdit', 'cancel', 'delete', 'add', 'save'];
    private isNormaledit: boolean = this.parent.editSettings.mode === 'Normal';
    /** @hidden */
    public virtualData: Object = {};
    private emptyRowData: Object = {};
    private vfColIndex: number[] = [];
    private frzIdx: number = 1;
    private initialRowTop: number;
    private orderRowObj: Row<Column>[] = [];
    private mvbOrderRowObj: Row<Column>[] = [];
    private frOrderRowObj: Row<Column>[] = [];

    constructor(parent: IGrid, locator?: ServiceLocator) {
        super(parent, locator);
        this.locator = locator;
        this.eventListener('on');
        this.parent.on(events.columnVisibilityChanged, this.setVisible, this);
        this.vgenerator = <VirtualRowModelGenerator>this.generator;
    }

    public renderTable(): void {
        this.header = <VirtualHeaderRenderer>this.locator.getService<RendererFactory>('rendererFactory').getRenderer(RenderType.Header);
        super.renderTable();
        this.virtualEle.table = <HTMLElement>this.getTable();
        this.virtualEle.content = this.content = <HTMLElement>this.getPanel().querySelector('.e-content');
        this.virtualEle.renderWrapper(<number>this.parent.height);
        this.virtualEle.renderPlaceHolder();
        this.virtualEle.wrapper.style.position = 'absolute';
        let debounceEvent: boolean = (this.parent.dataSource instanceof DataManager && !this.parent.dataSource.dataSource.offline);
        let opt: InterSection = {
            container: this.content, pageHeight: this.getBlockHeight() * 2, debounceEvent: debounceEvent,
            axes: this.parent.enableColumnVirtualization ? ['X', 'Y'] : ['Y']
        };
        this.observer = new InterSectionObserver(this.virtualEle.wrapper, opt);
    }

    public renderEmpty(tbody: HTMLElement): void {
        this.getTable().appendChild(tbody);
        this.virtualEle.adjustTable(0, 0);
    }

    public getReorderedFrozenRows(args: NotifyArgs): Row<Column>[] {
        let blockIndex: number[] = args.virtualInfo.blockIndexes;
        let colsIndex: number[] = args.virtualInfo.columnIndexes;
        let page: number = args.virtualInfo.page;
        args.virtualInfo.blockIndexes = [1, 2];
        args.virtualInfo.page = 1;
        if (!args.renderMovableContent) {
            args.virtualInfo.columnIndexes = [];
        }
        let recordslength: number = this.parent.getCurrentViewRecords().length;
        let firstRecords: object[] = this.parent.renderModule.data.dataManager.dataSource.json.slice(0, recordslength);
        let virtualRows: Row<Column>[] = this.vgenerator.generateRows(firstRecords, args);
        args.virtualInfo.blockIndexes = blockIndex;
        args.virtualInfo.columnIndexes = colsIndex;
        args.virtualInfo.page = page;
        return virtualRows.splice(0, this.parent.frozenRows);
    }

    private scrollListener(scrollArgs: ScrollArg): void {
        this.scrollAfterEdit();
        if (this.parent.enablePersistence) {
            this.parent.scrollPosition = scrollArgs.offset;
        }
        if (this.preventEvent || this.parent.isDestroyed) { this.preventEvent = false; return; }
        if (isNullOrUndefined(document.activeElement)) {
            this.isFocused = false;
        } else {
            this.isFocused = this.content === closest(document.activeElement, '.e-content') || this.content === document.activeElement;
        }
        let info: SentinelType = scrollArgs.sentinel;
        let pStartIndex: number = this.preStartIndex;
        let previousColIndexes: number[] = this.parent.getColumnIndexesInView();
        let viewInfo: VirtualInfo = this.currentInfo = this.getInfoFromView(scrollArgs.direction, info, scrollArgs.offset);
        if (isBlazor() && this.parent.isServerRendered && this.parent.enableColumnVirtualization &&
        (JSON.stringify(previousColIndexes) !== JSON.stringify(viewInfo.columnIndexes))) {
            this.parent.refreshHeader();
            let translateX: number = this.getColumnOffset(this.startColIndex - 1);
            let width: string = this.getColumnOffset(this.endColIndex - 1) - translateX + '';
            this.parent.notify('refresh-virtual-indices', { requestType: 'virtualscroll', startColumnIndex: viewInfo.columnIndexes[0],
            endColumnIndex: viewInfo.columnIndexes[viewInfo.columnIndexes.length - 1], axis: 'X',
            VTablewidth: width, translateX: this.getColumnOffset(viewInfo.columnIndexes[0] - 1) });
            this.parent.notify('setcolumnstyles', {});
        }
        if (isGroupAdaptive(this.parent) && !isBlazor()) {
            if ((info.axis === 'Y' && viewInfo.blockIndexes && this.prevInfo.blockIndexes.toString() === viewInfo.blockIndexes.toString())
                && scrollArgs.direction === 'up' && viewInfo.blockIndexes[viewInfo.blockIndexes.length - 1] !== 2) {
                return;
            } else {
                viewInfo.event = 'refresh-virtual-block';
                if (!isNullOrUndefined(viewInfo.offsets)) {
                    viewInfo.offsets.top = this.content.scrollTop;
                }
                this.parent.notify(
                    viewInfo.event,
                    { requestType: 'virtualscroll', virtualInfo: viewInfo, focusElement: scrollArgs.focusElement });
                return;
            }
        }
        if (!isBlazor() || (isBlazor() && !this.parent.isServerRendered)) {
            if (this.prevInfo && ((info.axis === 'Y' && this.prevInfo.blockIndexes.toString() === viewInfo.blockIndexes.toString())
                || (info.axis === 'X' && this.prevInfo.columnIndexes.toString() === viewInfo.columnIndexes.toString()))) {
                if (Browser.isIE) {
                    this.parent.hideSpinner();
                }
                this.requestType = this.requestType === 'virtualscroll' ? this.empty as string : this.requestType;
                this.restoreEdit();
                return;
            }
        }

        this.parent.setColumnIndexesInView(this.parent.enableColumnVirtualization ? viewInfo.columnIndexes : []);
        if (!isBlazor() || (isBlazor() && !this.parent.isServerRendered)) {
            this.parent.pageSettings.currentPage = viewInfo.loadNext && !viewInfo.loadSelf ? viewInfo.nextInfo.page : viewInfo.page;
        } else if (isBlazor() && this.parent.isServerRendered && this.preStartIndex !== pStartIndex &&
        this.parent.pageSettings.currentPage === viewInfo.currentPage) {
            this.parent.notify('refresh-virtual-indices', { requestType: 'virtualscroll', virtualStartIndex: viewInfo.startIndex,
            virtualEndIndex: viewInfo.endIndex, axis: 'Y', RHeight: this.parent.getRowHeight() });
        }
        if (!isBlazor() || (isBlazor() && !this.parent.isServerRendered)) {
            this.requestType = 'virtualscroll';
            this.parent.notify(viewInfo.event, { requestType: 'virtualscroll', virtualInfo: viewInfo,
            focusElement: scrollArgs.focusElement });
        } else if (this.preStartIndex !== pStartIndex && this.parent.pageSettings.currentPage !== viewInfo.currentPage) {
            this.parent.pageSettings.currentPage = viewInfo.currentPage;
            this.parent.notify(viewInfo.event, { requestType: 'virtualscroll', virtualStartIndex: viewInfo.startIndex,
            virtualEndIndex: viewInfo.endIndex, axis: 'Y', RHeight: this.parent.getRowHeight() });
        }
    }

    private block(blk: number): boolean {
        return this.vgenerator.isBlockAvailable(blk);
    }

    private getInfoFromView(direction: string, info: SentinelType, e: Offsets): VirtualInfo {
        let isBlockAdded: boolean = false;
        let tempBlocks: number[] = [];
        let infoType: VirtualInfo = { direction: direction, sentinelInfo: info, offsets: e,
            startIndex: this.preStartIndex, endIndex: this.preEndIndex };
        let vHeight: string | number = this.parent.height.toString().indexOf('%') < 0 ? this.content.getBoundingClientRect().height :
            this.parent.element.getBoundingClientRect().height;
        infoType.page = this.getPageFromTop(e.top, infoType);
        infoType.blockIndexes = tempBlocks = this.vgenerator.getBlockIndexes(infoType.page);
        infoType.loadSelf = !this.vgenerator.isBlockAvailable(tempBlocks[infoType.block]);
        let blocks: number[] = this.ensureBlocks(infoType);
        if (this.activeKey === 'upArrow' && infoType.blockIndexes.toString() !== blocks.toString()) {
            // To avoid dupilcate row index problem in key focus support
            let newBlock: number = blocks[blocks.length - 1];
            if (infoType.blockIndexes.indexOf(newBlock) === -1) {
                isBlockAdded = true;
            }
        }
        infoType.blockIndexes = blocks;
        infoType.loadNext = !blocks.filter((val: number) => tempBlocks.indexOf(val) === -1)
            .every(this.block.bind(this));
        infoType.event = (infoType.loadNext || infoType.loadSelf) ? modelChanged : refreshVirtualBlock;
        infoType.nextInfo = infoType.loadNext ? { page: Math.max(1, infoType.page + (direction === 'down' ? 1 : -1)) } : {};
        if (isBlockAdded) {
            infoType.blockIndexes = [infoType.blockIndexes[0] - 1, infoType.blockIndexes[0], infoType.blockIndexes[0] + 1];
        }
        if (this.activeKey === 'downArrow') {
            let firstBlock: number = Math.ceil(this.rowIndex / this.getBlockSize());
            if (firstBlock !== 1 && (infoType.blockIndexes[1] !== firstBlock || infoType.blockIndexes.length < 3)) {
                infoType.blockIndexes = [firstBlock - 1, firstBlock, firstBlock + 1];
            }
        }
        infoType.columnIndexes = info.axis === 'X' ? this.vgenerator.getColumnIndexes() : this.parent.getColumnIndexesInView();
        if (this.parent.enableColumnVirtualization && info.axis === 'X') {
            infoType.event = refreshVirtualBlock;
        }
        if (isBlazor() && this.parent.isServerRendered) {
            let rowHeight: number = this.parent.getRowHeight();
            let exactTopIndex: number = e.top / rowHeight;
            let noOfInViewIndexes: number = vHeight / rowHeight;
            let exactEndIndex: number = exactTopIndex + noOfInViewIndexes;
            let pageSizeBy4: number = this.parent.pageSettings.pageSize / 4;
            if (infoType.direction === 'down') {
                let sIndex: number = Math.round(exactEndIndex) - Math.round((pageSizeBy4));
                if (isNullOrUndefined(infoType.startIndex) || (exactEndIndex >
                (infoType.startIndex + Math.round((this.parent.pageSettings.pageSize / 2 + pageSizeBy4)))
                && infoType.endIndex !== this.count)) {
                    infoType.startIndex = sIndex >= 0 ? Math.round(sIndex) : 0;
                    infoType.startIndex = infoType.startIndex > exactTopIndex ? Math.floor(exactTopIndex) : infoType.startIndex;
                    let eIndex: number = infoType.startIndex + this.parent.pageSettings.pageSize;
                    infoType.startIndex = eIndex < exactEndIndex ? (Math.ceil(exactEndIndex) - this.parent.pageSettings.pageSize)
                    : infoType.startIndex;
                    infoType.endIndex =  eIndex < this.count ? eIndex : this.count;
                    infoType.startIndex = eIndex >= this.count ?
                    infoType.endIndex - this.parent.pageSettings.pageSize : infoType.startIndex;
                    infoType.currentPage = Math.ceil(infoType.endIndex / this.parent.pageSettings.pageSize);
                    this.setKeyboardNavIndex();
                }
            } else if (infoType.direction === 'up') {
                if (infoType.startIndex && infoType.endIndex) {
                    let loadAtIndex: number = Math.round(((infoType.startIndex * rowHeight) + (pageSizeBy4 * rowHeight)) / rowHeight);
                    if (exactTopIndex < loadAtIndex) {
                        let idxAddedToExactTop: number = (pageSizeBy4) > noOfInViewIndexes ? pageSizeBy4 :
                        (noOfInViewIndexes + noOfInViewIndexes / 4);
                        let eIndex: number = Math.round(exactTopIndex + idxAddedToExactTop);
                        infoType.endIndex = eIndex < this.count ? eIndex : this.count;
                        let sIndex: number = infoType.endIndex - this.parent.pageSettings.pageSize;
                        infoType.startIndex = sIndex > 0 ? sIndex : 0;
                        infoType.endIndex = sIndex < 0 ? this.parent.pageSettings.pageSize : infoType.endIndex;
                        infoType.currentPage = Math.ceil(infoType.startIndex / this.parent.pageSettings.pageSize);
                        this.setKeyboardNavIndex();
                    }
                }
            }
            this.preStartIndex = this.startIndex = infoType.startIndex;
            this.preEndIndex = infoType.endIndex;
            infoType.event = (infoType.currentPage !== this.parent.pageSettings.currentPage) ? modelChanged : refreshVirtualBlock;
        }
        return infoType;
    }

    private setKeyboardNavIndex(): void {
        this.blazorDataLoad = true;
        if (this.activeKey === 'downArrow' || this.activeKey === 'upArrow') {
            this.blzRowIndex = this.activeKey === 'downArrow' ? this.rowIndex + 1 : this.rowIndex - 1;
            (document.activeElement as HTMLElement).blur();
        }
    }

    public ensureBlocks(info: VirtualInfo): number[] {
        let index: number = info.blockIndexes[info.block]; let mIdx: number;
        let old: number = index; let max: Function = Math.max;
        let indexes: number[] = info.direction === 'down' ? [max(index, 1), ++index, ++index] : [max(index - 1, 1), index, index + 1];
        if (this.parent.enableColumnVirtualization && this.parent.isFrozenGrid()) {
            // To avoid frozen content white space issue
            if (info.sentinelInfo.axis === 'X' || (info.sentinelInfo.axis === 'Y' && (info.page === this.prevInfo.page))) {
                indexes = this.prevInfo.blockIndexes;
            }
        }
        indexes = indexes.filter((val: number, ind: number) => indexes.indexOf(val) === ind);
        if (this.prevInfo.blockIndexes.toString() === indexes.toString()) {
            return indexes;
        }

        if (info.loadSelf || (info.direction === 'down' && this.isEndBlock(old))) {
            indexes = this.vgenerator.getBlockIndexes(info.page);
        }

        indexes.some((val: number, ind: number) => {
            let result: boolean = val === (isGroupAdaptive(this.parent) ? this.getGroupedTotalBlocks() : this.getTotalBlocks());
            if (result) { mIdx = ind; }
            return result;
        });

        if (mIdx !== undefined) {
            indexes = indexes.slice(0, mIdx + 1);
            if (info.block === 0 && indexes.length === 1 && this.vgenerator.isBlockAvailable(indexes[0] - 1)) {
                indexes = [indexes[0] - 1, indexes[0]];
            }
        }

        return indexes;
    }

    // tslint:disable-next-line:max-func-body-length
    public appendContent(target: HTMLElement, newChild: DocumentFragment | HTMLElement, e: NotifyArgs): void {
        // currentInfo value will be used if there are multiple dom updates happened due to mousewheel
        let isFrozen: boolean = this.parent.isFrozenGrid();
        let frzCols: number = this.parent.getFrozenColumns() || this.parent.getFrozenLeftColumnsCount();
        let colVFtable: boolean = this.parent.enableColumnVirtualization && isFrozen;
        this.checkFirstBlockColIndexes(e);
        let info: VirtualInfo = e.virtualInfo.sentinelInfo && e.virtualInfo.sentinelInfo.axis === 'Y' && this.currentInfo.page &&
            this.currentInfo.page !== e.virtualInfo.page ? this.currentInfo : e.virtualInfo;
        this.prevInfo = this.prevInfo || e.virtualInfo;
        let cBlock: number = (info.columnIndexes[0]) - 1;
        if (colVFtable && info.columnIndexes[0] === frzCols) {
            cBlock = (info.columnIndexes[0] - frzCols) - 1;
        }
        let cOffset: number = this.getColumnOffset(cBlock);
        let width: string; let blocks: number[] = info.blockIndexes;
        if (this.parent.groupSettings.columns.length) {
            this.refreshOffsets();
        }
        if (this.parent.height === '100%') {
            this.parent.element.style.height = '100%';
        }
        let vHeight: string | number = this.parent.height.toString().indexOf('%') < 0 ? this.content.getBoundingClientRect().height :
            this.parent.element.getBoundingClientRect().height;
        if (!this.requestTypes.some((value: string) => value === this.requestType)) {
            let translate: number = this.getTranslateY(this.content.scrollTop, <number>vHeight, info);
            this.virtualEle.adjustTable(colVFtable ? 0 : cOffset, translate);
            if (colVFtable) {
                this.virtualEle.adjustMovableTable(cOffset, 0);
            }
        }
        if (this.parent.enableColumnVirtualization) {
            this.header.virtualEle.adjustTable(colVFtable ? 0 : cOffset, 0);
            if (colVFtable) {
                this.header.virtualEle.adjustMovableTable(cOffset, 0);
            }
        }

        if (this.parent.enableColumnVirtualization) {
            let cIndex: number[] = info.columnIndexes;
            width = this.getColumnOffset(cIndex[cIndex.length - 1]) - this.getColumnOffset(cIndex[0] - 1) + '';
            if (colVFtable) {
                this.header.virtualEle.setMovableWrapperWidth(width);
            } else {
                this.header.virtualEle.setWrapperWidth(width);
            }
        }
        if (colVFtable) {
            this.virtualEle.setMovableWrapperWidth(width, <boolean>Browser.isIE || Browser.info.name === 'edge');
        } else {
            this.virtualEle.setWrapperWidth(width, <boolean>Browser.isIE || Browser.info.name === 'edge');
        }
        if (!isNullOrUndefined(target.parentNode)) {
            remove(target);
        }
        let tbody: HTMLElement;
        if (isFrozen) {
            if (e.renderFrozenRightContent) {
                tbody = this.parent.getContent().querySelector('.e-frozen-right-content').querySelector('tbody');
            } else if (!e.renderMovableContent) {
                tbody = this.parent.getFrozenVirtualContent().querySelector('tbody');
            } else if (e.renderMovableContent) {
                tbody = this.parent.getMovableVirtualContent().querySelector('tbody');
            }
        } else {
            tbody = this.parent.element.querySelector('.e-content').querySelector('tbody');
        }
        if (tbody) {
            remove(tbody);
            target = null;
        }
        let isReact: boolean = this.parent.isReact && !isNullOrUndefined(this.parent.rowTemplate);
        if (!isReact) {
            target = this.parent.createElement('tbody');
            target.appendChild(newChild);
        } else {
            target = newChild as HTMLElement;
        }
        if (this.parent.frozenRows && e.requestType === 'virtualscroll' && this.parent.pageSettings.currentPage === 1) {
            for (let i: number = 0; i < this.parent.frozenRows; i++) {
                target.children[0].remove();
            }
        }
        if (isFrozen) {
            if (e.renderFrozenRightContent) {
                this.parent.getContent().querySelector('.e-frozen-right-content').querySelector('.e-table').appendChild(target);
                this.requestType = this.requestType === 'virtualscroll' ? this.empty as string : this.requestType;
            } else if (!e.renderMovableContent) {
                this.parent.getFrozenVirtualContent().querySelector('.e-table').appendChild(target);
            } else if (e.renderMovableContent) {
                this.parent.getMovableVirtualContent().querySelector('.e-table').appendChild(target);
                if (this.parent.getFrozenMode() !== 'Left-Right') {
                    this.requestType = this.requestType === 'virtualscroll' ? this.empty as string : this.requestType;
                }
            }
            if (this.vfColIndex.length) {
                e.virtualInfo.columnIndexes = info.columnIndexes = extend([], this.vfColIndex) as number[];
                this.vfColIndex = e.renderMovableContent ? [] : this.vfColIndex;
            }
        } else {
            this.getTable().appendChild(target);
            this.requestType = this.requestType === 'virtualscroll' ? this.empty as string : this.requestType;
        }
        if (this.parent.groupSettings.columns.length) {
            if (!isGroupAdaptive(this.parent) && info.direction === 'up') {
                let blk: number = this.offsets[this.getTotalBlocks()] - this.prevHeight;
                this.preventEvent = true; let sTop: number = this.content.scrollTop;
                this.content.scrollTop = sTop + blk;
            }
            this.setVirtualHeight();
            this.observer.setPageHeight(this.getOffset(blocks[blocks.length - 1]) - this.getOffset(blocks[0] - 1));
        }
        this.prevInfo = info;
        if (this.isFocused  && this.activeKey !== 'downArrow' && this.activeKey !== 'upArrow') {
            this.content.focus();
        }
        let lastPage: number = Math.ceil(this.getTotalBlocks() / 2);
        if (this.isBottom) {
            this.isBottom = false;
            this.parent.getContent().firstElementChild.scrollTop = this.offsets[this.offsetKeys.length - 1];
        }
        if ((this.parent.pageSettings.currentPage === lastPage) && blocks.length === 1) {
            this.isBottom = true;
            this.parent.getContent().firstElementChild.scrollTop = this.offsets[this.offsetKeys.length - 2];
        }
        if (e.requestType === 'virtualscroll' && e.virtualInfo.sentinelInfo.axis === 'X') {
            this.parent.notify(events.autoCol, {});
        }
        this.focusCell(e);
        this.restoreEdit(e);
        this.restoreAdd(e);
        if (!this.initialRowTop) {
            this.initialRowTop = this.parent.getRowByIndex(0).getBoundingClientRect().top;
        }
    }

    private checkFirstBlockColIndexes(e: NotifyArgs): void {
        if (this.parent.enableColumnVirtualization && this.parent.isFrozenGrid() && e.virtualInfo.columnIndexes[0] === 0) {
            let indexes: number[] = [];
            let frozenCols: number = this.parent.getFrozenColumns() || this.parent.getFrozenLeftColumnsCount();
            if (!e.renderMovableContent && e.virtualInfo.columnIndexes.length > frozenCols) {
                this.vfColIndex = e.virtualInfo.columnIndexes;
                for (let i: number = 0; i < frozenCols; i++) {
                    indexes.push(i);
                }
                e.virtualInfo.columnIndexes = indexes;
            } else if (e.renderMovableContent) {
                if (!this.vfColIndex.length) {
                    this.vfColIndex = extend([], e.virtualInfo.columnIndexes) as number[];
                }
                e.virtualInfo.columnIndexes = extend([], this.vfColIndex) as number[];
                e.virtualInfo.columnIndexes.splice(0, frozenCols);
            }
        }
    }

    private focusCell(e: NotifyArgs): void {
        if (this.activeKey !== 'upArrow' && this.activeKey !== 'downArrow') {
            return;
        }
        let row: Element = this.parent.getRowByIndex(this.rowIndex);
        // tslint:disable-next-line:no-any
        let cell: any = (<{ cells?: HTMLElement[] }>row).cells[this.cellIndex];
        cell.focus({ preventScroll: true });
        this.parent.selectRow(parseInt(row.getAttribute('aria-rowindex'), 10));
        this.activeKey = this.empty as string;
    }

    private restoreEdit(e?: NotifyArgs): void {
        if (this.isNormaledit) {
            let left: number = this.parent.getFrozenColumns();
            let isFrozen: boolean = e && this.parent.isFrozenGrid();
            let table: freezeMode = this.parent.getFrozenMode();
            let trigger: boolean = e && (left || table === 'Left' || table === 'Right' ? e.renderMovableContent
                : e.renderFrozenRightContent);
            if ((!isFrozen || (isFrozen && trigger)) && this.parent.editSettings.allowEditing
                && this.parent.editModule && !isNullOrUndefined(this.editedRowIndex)) {
                let row: HTMLTableRowElement = this.getRowByIndex(this.editedRowIndex) as HTMLTableRowElement;
                if (Object.keys(this.virtualData).length && row && !this.content.querySelector('.e-editedrow')) {
                    let top: number = row.getBoundingClientRect().top;
                    if (top < this.content.offsetHeight && top > this.parent.getRowHeight()) {
                        this.parent.isEdit = false;
                        this.parent.editModule.startEdit(row);
                    }
                }
                if (row && this.content.querySelector('.e-editedrow') && !Object.keys(this.virtualData).length) {
                    let rowData: Object = extend({}, this.getRowObjectByIndex(this.editedRowIndex));
                    this.virtualData = this.getVirtualEditedData(rowData);
                }
            }
            this.restoreAdd(e);
        }
    }

    private getVirtualEditedData(rowData: Object): Object {
        let editForms: Element = [].slice.call(this.parent.element.querySelectorAll('.e-gridform'));
        let isFrozen: boolean = this.parent.isFrozenGrid();
        let data: Object = this.parent.editModule.getCurrentEditedData(editForms[0], rowData);
        if (isFrozen) {
            if (this.parent.getFrozenMode() !== 'Left-Right') {
                data = this.parent.editModule.getCurrentEditedData(editForms[1], rowData);
            } else {
                data = this.parent.editModule.getCurrentEditedData(editForms[1], rowData);
                data = this.parent.editModule.getCurrentEditedData(editForms[2], rowData);
            }
        }
        return data;
    }

    private restoreAdd(e?: NotifyArgs): void {
        let left: number = this.parent.getFrozenColumns();
        let isFrozen: boolean = e && this.parent.isFrozenGrid();
        let table: freezeMode = this.parent.getFrozenMode();
        let trigger: boolean = e && (left || table === 'Left' || table === 'Right' ? e.renderMovableContent : e.renderFrozenRightContent);
        if ((!isFrozen || (isFrozen && trigger)) && this.isNormaledit && this.isAdd && !this.parent.element.querySelector('.e-addedrow')) {
            let isTop: boolean = this.parent.editSettings.newRowPosition === 'Top' && this.content.scrollTop < this.parent.getRowHeight();
            let isBottom: boolean = this.parent.editSettings.newRowPosition === 'Bottom'
                && this.parent.pageSettings.currentPage === this.maxPage;
            if (isTop || isBottom) {
                this.parent.isEdit = false;
                this.parent.addRecord();
            }
        }
    }

    protected onDataReady(e?: NotifyArgs): void {
        if (!isNullOrUndefined(e.count)) {
            this.count = e.count;
            this.maxPage = Math.ceil(e.count / this.parent.pageSettings.pageSize);
        }
        this.vgenerator.checkAndResetCache(e.requestType);
        if (['refresh', 'filtering', 'searching', 'grouping', 'ungrouping', 'reorder', undefined]
            .some((value: string) => { return e.requestType === value; })) {
            this.refreshOffsets();
        }
        this.setVirtualHeight();
        this.resetScrollPosition(e.requestType);
    }

    /** @hidden */
    public setVirtualHeight(height?: number): void {
        let width: string = this.parent.enableColumnVirtualization ?
            this.getColumnOffset(this.parent.columns.length + this.parent.groupSettings.columns.length - 1) + 'px' : '100%';
        if (this.parent.isFrozenGrid()) {
            let virtualHeightTemp: number = (this.parent.pageSettings.currentPage === 1 && Object.keys(this.offsets).length <= 2) ?
                this.offsets[1] : this.offsets[this.getTotalBlocks() - 2];
            let scrollableElementHeight: number = this.content.clientHeight;
            virtualHeightTemp = virtualHeightTemp > scrollableElementHeight ? virtualHeightTemp : 0;
            // To overcome the white space issue in last page (instead of position absolute)
            this.virtualEle.setVirtualHeight(virtualHeightTemp, width);
        } else {
            let virtualHeight: number = (isBlazor() && this.parent.isServerRendered && this.parent.groupSettings.columns.length && height)
                ? height : (this.offsets[isGroupAdaptive(this.parent) ? this.getGroupedTotalBlocks() : this.getTotalBlocks()]);
            this.virtualEle.setVirtualHeight(virtualHeight, width);
        }
        if (this.parent.enableColumnVirtualization) {
            this.header.virtualEle.setVirtualHeight(1, width);
            if (this.parent.isFrozenGrid()) {
                this.virtualEle.setMovableVirtualHeight(1, width);
                this.header.virtualEle.setMovableVirtualHeight(1, width);
            }
        }
    }

    private getPageFromTop(sTop: number, info: VirtualInfo): number {
        let total: number = (isGroupAdaptive(this.parent)) ? this.getGroupedTotalBlocks() : this.getTotalBlocks();
        let page: number = 0; let extra: number = this.offsets[total] - this.prevHeight;
        this.offsetKeys.some((offset: string) => {
            let iOffset: number = Number(offset);
            let border: boolean = sTop <= this.offsets[offset] || (iOffset === total && sTop > this.offsets[offset]);
            if (border) {
                if (this.offsetKeys.length % 2 !== 0 && iOffset.toString() === this.offsetKeys[this.offsetKeys.length - 2]
                    && sTop <= this.offsets[this.offsetKeys.length - 1]) {
                    iOffset = iOffset + 1;
                }
                info.block = iOffset % 2 === 0 ? 1 : 0;
                page = Math.max(1, Math.min(this.vgenerator.getPage(iOffset), this.maxPage));
            }
            return border;
        });
        return page;
    }

    protected getTranslateY(sTop: number, cHeight: number, info?: VirtualInfo, isOnenter?: boolean): number {
        if (info === undefined) {
            info = { page: this.getPageFromTop(sTop, {}) };
            info.blockIndexes = this.vgenerator.getBlockIndexes(info.page);
        }
        let block: number = (info.blockIndexes[0] || 1) - 1;
        let translate: number = this.getOffset(block);
        let endTranslate: number = this.getOffset(info.blockIndexes[info.blockIndexes.length - 1]);
        if (isOnenter) {
            info = this.prevInfo;
        }
        let result: number = translate > sTop ?
            this.getOffset(block - 1) : endTranslate < (sTop + cHeight) ? this.getOffset(block + 1) : translate;
        let blockHeight: number = this.offsets[info.blockIndexes[info.blockIndexes.length - 1]] -
            this.tmpOffsets[info.blockIndexes[0]];
        let totalBlocks: number = isGroupAdaptive(this.parent) ? this.getGroupedTotalBlocks() : this.getTotalBlocks();
        if (result + blockHeight > this.offsets[totalBlocks]) {
            result -= (result + blockHeight) - this.offsets[totalBlocks];
        }
        return result;
    }

    public getOffset(block: number): number {
        return Math.min(this.offsets[block] | 0, this.offsets[this.maxBlock] | 0);
    }

    private onEntered(): Function {
        return (element: HTMLElement, current: SentinelType, direction: string, e: Offsets, isWheel: boolean, check: boolean) => {
            if (Browser.isIE && !isWheel && check && !this.preventEvent) {
                this.parent.showSpinner();
            }
            let colVFtable: boolean = this.parent.enableColumnVirtualization && this.parent.isFrozenGrid();
            let xAxis: boolean = current.axis === 'X'; let top: number = this.prevInfo.offsets ? this.prevInfo.offsets.top : null;
            let height: number = this.content.getBoundingClientRect().height;
            let x: number = this.getColumnOffset(xAxis ? this.vgenerator.getColumnIndexes()[0] - 1 : this.prevInfo.columnIndexes[0] - 1);
            let y: number = this.getTranslateY(e.top, height, xAxis && top === e.top ? this.prevInfo : undefined, true);
            if (isBlazor() && this.parent.isServerRendered && this.currentInfo && this.currentInfo.startIndex && xAxis) {
                y = this.currentInfo.startIndex * this.parent.getRowHeight();
            }
            this.virtualEle.adjustTable(colVFtable ? 0 : x, Math.min(y, this.offsets[this.maxBlock]));
            if (colVFtable) {
                this.virtualEle.adjustMovableTable(x, 0);
            }
            if (isBlazor() && this.parent.isServerRendered && xAxis) {
                this.parent.notify('setcolumnstyles', { refresh: true });
            }
            if (this.parent.enableColumnVirtualization && (!isBlazor() || (isBlazor() && !this.parent.isServerRendered ))) {
                this.header.virtualEle.adjustTable(colVFtable ? 0 : x, 0);
                if (colVFtable) {
                    this.header.virtualEle.adjustMovableTable(x, 0);
                }
            }
        };
    }

    private dataBound(): void {
        this.parent.notify(events.refreshVirtualFrozenHeight, {});
        if (this.isSelection && this.activeKey !== 'upArrow' && this.activeKey !== 'downArrow') {
            this.parent.selectRow(this.selectedRowIndex);
        } else if (!isBlazor()) {
            this.activeKey = this.empty as string;
        }
    }

    private rowSelected(args: RowSelectEventArgs): void {
        if (this.isSelection && !this.isLastBlockRow(args.rowIndex)) {
            let transform: { width: number, height: number } = getTransformValues(this.content.firstElementChild);
            let rowTop: number = (args.row as HTMLElement).getBoundingClientRect().top;
            let height: number = this.content.getBoundingClientRect().height;
            let isBottom: boolean = height < rowTop;
            let remainHeight: number = isBottom ? rowTop - height : this.initialRowTop - rowTop;
            let translateY: number = isBottom ? transform.height - remainHeight : transform.height + remainHeight;
            this.virtualEle.adjustTable(transform.width, translateY);
        }
        this.isSelection = false;
    }

    private isLastBlockRow(index: number): boolean {
        let scrollEle: Element = this.parent.getContent().firstElementChild;
        let visibleRowCount: number = Math.floor((scrollEle as HTMLElement).offsetHeight / this.parent.getRowHeight()) - 1;
        let startIdx: number = (this.maxPage * this.parent.pageSettings.pageSize) - visibleRowCount;
        return index >= startIdx;
    }

    private refreshVirtualCacheOnRowDD(args: { objIndex: number, end: boolean, startIndex: number }): void {
        let blockSize: number = this.getBlockSize();
        let currentblk: number = Math.ceil((args.objIndex + 1) / blockSize);
        let secondBlock: number = args.objIndex - args.startIndex >= blockSize ? blockSize : 0;
        let thirdBlock: number = args.objIndex - args.startIndex >= (blockSize + blockSize) ? blockSize : 0;
        this.orderRowObj.push(this.vgenerator.cache[currentblk][args.objIndex - args.startIndex - secondBlock - thirdBlock]);
        if (this.parent.isFrozenGrid()) {
            this.mvbOrderRowObj.push(this.vgenerator.movableCache[currentblk][args.objIndex - args.startIndex - secondBlock - thirdBlock]);
            if (this.parent.getFrozenMode() === 'Left-Right') {
                this.frOrderRowObj.push(this.vgenerator.frozenRightCache[currentblk]
                    [args.objIndex - args.startIndex - secondBlock - thirdBlock]);
            }
        }
        if (args.end === true) {
            let currentBlocks: number[] = this.currentInfo.blockIndexes;
            if (!currentBlocks) {
                currentBlocks = [1, 2];
            }
            resetRowObjectIndex(this.parent, this.orderRowObj, args.startIndex);
            if (this.parent.isFrozenGrid()) {
                resetRowObjectIndex(this.parent, this.mvbOrderRowObj, args.startIndex);
                if (this.parent.getFrozenMode() === 'Left-Right') {
                    resetRowObjectIndex(this.parent, this.frOrderRowObj, args.startIndex);
                }
            }
            for (let i: number = 0; i < currentBlocks.length; i++) {
                this.vgenerator.cache[currentBlocks[i]] = this.orderRowObj.splice(0, blockSize);
                if (this.parent.isFrozenGrid()) {
                    this.vgenerator.movableCache[currentBlocks[i]] = this.mvbOrderRowObj.splice(0, blockSize);
                    if (this.parent.getFrozenMode() === 'Left-Right') {
                        this.vgenerator.frozenRightCache[currentBlocks[i]] = this.frOrderRowObj.splice(0, blockSize);
                    }
                }
            }
            this.orderRowObj = [];
            this.orderRowObj = [];
            this.mvbOrderRowObj = [];
        }
    }

    private refreshMaxPage(): void {
        if (this.parent.groupSettings.columns.length && this.parent.vcRows.length) {
            this.maxPage = Math.ceil(this.parent.vcRows.length / this.parent.pageSettings.pageSize);
        }
    }

    public eventListener(action: string): void {
        this.parent[action](dataReady, this.onDataReady, this);
        this.parent.addEventListener(events.dataBound, this.dataBound.bind(this));
        this.parent.addEventListener(events.actionBegin, this.actionBegin.bind(this));
        this.parent.addEventListener(events.actionComplete, this.actionComplete.bind(this));
        this.parent.addEventListener(events.rowSelected, this.rowSelected.bind(this));
        this.parent[action](refreshVirtualBlock, this.refreshContentRows, this);
        this.parent[action](events.selectVirtualRow, this.selectVirtualRow, this);
        this.parent[action](events.virtaulCellFocus, this.virtualCellFocus, this);
        this.parent[action](events.virtualScrollEditActionBegin, this.editActionBegin, this);
        this.parent[action](events.virtualScrollAddActionBegin, this.addActionBegin, this);
        this.parent[action](events.virtualScrollEdit, this.restoreEdit, this);
        this.parent[action](events.virtualScrollEditSuccess, this.editSuccess, this);
        this.parent[action](events.refreshVirtualCache, this.refreshCache, this);
        this.parent[action](events.editReset, this.resetIsedit, this);
        this.parent[action](events.getVirtualData, this.getVirtualData, this);
        this.parent[action](events.virtualScrollEditCancel, this.editCancel, this);
        this.parent[action](events.refreshVirtualCacheOnRowDD, this.refreshVirtualCacheOnRowDD, this);
        this.parent[action](events.refreshVirtualMaxPage, this.refreshMaxPage, this);
        let event: string[] = this.actions;
        for (let i: number = 0; i < event.length; i++) {
            this.parent[action](`${event[i]}-begin`, this.onActionBegin, this);
        }
        let fn: Function = () => {
            this.observer.observe((scrollArgs: ScrollArg) => this.scrollListener(scrollArgs), this.onEntered());
            let gObj: IGrid = this.parent;
            if (gObj.enablePersistence && gObj.scrollPosition) {
                this.content.scrollTop = gObj.scrollPosition.top;
                let scrollValues: ScrollArg = { direction: 'down', sentinel: this.observer.sentinelInfo.down,
                    offset: gObj.scrollPosition, focusElement: gObj.element };
                this.scrollListener(scrollValues);
                if (gObj.enableColumnVirtualization) {
                    this.content.scrollLeft = gObj.scrollPosition.left;
                }
            }
            this.parent.off(contentReady, fn);
        };
        this.parent.on(contentReady, fn, this);
    }

    /** @hidden */
    public getVirtualData(data: { virtualData: Object, isAdd: boolean, isCancel: boolean }): void {
        data.virtualData = this.virtualData;
        data.isAdd = this.isAdd;
        data.isCancel = this.isCancel;
    }

    private editCancel(args: { data: Object }): void {
        let dataIndex: number = getEditedDataIndex(this.parent, args.data);
        if (!isNullOrUndefined(dataIndex)) {
            args.data = this.parent.getCurrentViewRecords()[dataIndex];
        }
    }

    private editSuccess(args?: EditArgs): void {
        if (this.isNormaledit) {
            if (!this.isAdd && args.data) {
                this.updateCurrentViewData(args.data);
            }
            this.isAdd = false;
        }
    }

    private updateCurrentViewData(data: Object): void {
        let dataIndex: number = getEditedDataIndex(this.parent, data);
        if (!isNullOrUndefined(dataIndex)) {
            this.parent.getCurrentViewRecords()[dataIndex] = data;
        }
    }

    private actionBegin(args: NotifyArgs): void {
        if (args.requestType !== 'virtualscroll') {
            this.requestType = args.requestType;
        }
        if (!args.cancel) {
            this.parent.notify(events.refreshVirtualFrozenRows, args);
        }
    }

    private virtualCellFocus(e: KeyboardEventArgs): void {
        // To decide the action (select or scroll), when using arrow keys for cell focus
        let ele: Element = document.activeElement;
        if (ele.classList.contains('e-rowcell')
            && e && (e.action === 'upArrow' || e.action === 'downArrow')) {
            let rowIndex: number = parseInt(ele.parentElement.getAttribute('aria-rowindex'), 10);
            if (e && (e.action === 'downArrow' || e.action === 'upArrow')) {
                let scrollEle: Element = this.parent.getContent().firstElementChild;
                e.action === 'downArrow' ? rowIndex += 1 : rowIndex -= 1;
                this.rowIndex = rowIndex;
                this.cellIndex = parseInt(ele.getAttribute('aria-colindex'), 10);
                let row: Element = this.parent.getRowByIndex(rowIndex);
                let page: number = this.parent.pageSettings.currentPage;
                let visibleRowCount: number = Math.floor((scrollEle as HTMLElement).offsetHeight / this.parent.getRowHeight()) - 1;
                let emptyRow: boolean = false;
                if (isNullOrUndefined(row)) {
                    emptyRow = true;
                    if ((e.action === 'downArrow' && page === this.maxPage - 1) || (e.action === 'upArrow' && page === 1)) {
                        emptyRow = false;
                    }
                }
                if (emptyRow || (ensureLastRow(row, this.parent) && e.action === 'downArrow')
                    || (ensureFirstRow(row, this.parent.getRowHeight() * 2) && e.action === 'upArrow')) {
                    this.activeKey = e.action;
                    scrollEle.scrollTop = e.action === 'downArrow' ?
                        (rowIndex - visibleRowCount) * this.parent.getRowHeight() : rowIndex * this.parent.getRowHeight();
                } else {
                    this.activeKey = this.empty as string;
                }
                if (!isBlazor() || (isBlazor() && !this.blazorDataLoad)) {
                    this.parent.selectRow(rowIndex);
                }
            }
        }
    }

    private editActionBegin(e: { data: Object, index: number }): void {
        this.editedRowIndex = e.index;
        let rowData: Object = extend({}, this.getRowObjectByIndex(e.index));
        e.data = Object.keys(this.virtualData).length ? this.virtualData : rowData;
    }

    private refreshCache(data: Object): void {
        let block: number = Math.ceil((this.editedRowIndex + 1) / this.getBlockSize());
        let index: number = this.editedRowIndex - ((block - 1) * this.getBlockSize());
        this.vgenerator.cache[block][index].data = data;
        if (this.vgenerator.movableCache[block]) {
            this.vgenerator.movableCache[block][index].data = data;
        }
        if (this.vgenerator.frozenRightCache[block]) {
            this.vgenerator.frozenRightCache[block][index].data = data;
        }
    }

    private actionComplete(args: NotifyArgs): void {
        if (args.requestType === 'delete' || args.requestType === 'save' || args.requestType === 'cancel') {
            this.refreshOffsets();
            this.refreshVirtualElement();
            if (this.isNormaledit) {
                if (args.requestType === 'cancel') {
                    this.isCancel = true;
                }
                this.isAdd = false;
                this.editedRowIndex = this.empty as number;
                this.virtualData = {};
                (<{ previousVirtualData?: Object }>this.parent.editModule).previousVirtualData = {};
            }
        }
        if (this.parent.enableColumnVirtualization && args.requestType as string === 'filterafteropen'
            && this.currentInfo.columnIndexes && this.currentInfo.columnIndexes[0] > 0) {
            (this.parent as Grid).resetFilterDlgPosition((<{ columnName?: string }>args).columnName);
        }
    }

    private resetIsedit(): void {
        if (this.parent.enableVirtualization && this.isNormaledit) {
            if ((this.parent.editSettings.allowEditing && Object.keys(this.virtualData).length)
                || (this.parent.editSettings.allowAdding && this.isAdd)) {
                this.parent.isEdit = true;
            }
        }
    }

    private scrollAfterEdit(): void {
        if (this.parent.editModule && this.parent.editSettings.allowEditing && this.isNormaledit) {
            if (this.parent.element.querySelector('.e-gridform')) {
                let editForm: Element = this.parent.element.querySelector('.e-editedrow');
                let addForm: Element = this.parent.element.querySelector('.e-addedrow');
                if (editForm || addForm) {
                    let rowData: Object = editForm ? extend({}, this.getRowObjectByIndex(this.editedRowIndex))
                        : extend({}, this.emptyRowData);
                    this.virtualData = this.getVirtualEditedData(rowData);
                }
            }
        }
    }

    private createEmptyRowdata(): void {
        this.parent.getColumns().filter((e: Column) => {
            this.emptyRowData[e.field] = this.empty;
        });
    }

    private addActionBegin(args: { startEdit: boolean }): void {
        if (this.isNormaledit) {
            if (!Object.keys(this.emptyRowData).length) {
                this.createEmptyRowdata();
            }
            this.isAdd = true;
            let page: number = this.parent.pageSettings.currentPage;
            if (page > 1 && this.parent.editSettings.newRowPosition === 'Top') {
                this.isAdd = true;
                this.onActionBegin();
                args.startEdit = false;
                this.content.scrollTop = 0;
            }
            if (page < this.maxPage - 1 && this.parent.editSettings.newRowPosition === 'Bottom') {
                this.isAdd = true;
                this.parent.setProperties({ pageSettings: { currentPage: this.maxPage - 1 } }, true);
                args.startEdit = false;
                this.content.scrollTop = this.offsets[this.offsetKeys.length];
            }
        }
    }

     /** @hidden */
    public getRowObjectByIndex(index: number): Object {
        let data: Object = this.getRowCollection(index, false, true);
        return data;
    }

    public getBlockSize(): number {
        return this.parent.pageSettings.pageSize >> 1;
    }

    public getBlockHeight(): number {
        return this.getBlockSize() * this.parent.getRowHeight();
    }

    public isEndBlock(index: number): boolean {
        let totalBlocks: number = this.getTotalBlocks();
        return index >= totalBlocks || index === totalBlocks - 1;
    }

    public getGroupedTotalBlocks(): number {
        let rows: Object[] = this.parent.vcRows;
        return Math.floor((rows.length / this.getBlockSize()) < 1 ? 1 : rows.length / this.getBlockSize());
    }

    public getTotalBlocks(): number {
        return Math.ceil(this.count / this.getBlockSize());
    }

    public getColumnOffset(block: number): number {
        return this.vgenerator.cOffsets[block] | 0;
    }

    public getModelGenerator(): IModelGenerator<Column> {
        return new VirtualRowModelGenerator(this.parent);
    }

    private resetScrollPosition(action: string): void {
        if (this.actions.some((value: string) => value === action)) {
            this.preventEvent = this.content.scrollTop !== 0;
            this.content.scrollTop = 0;
        }
        if (action !== 'virtualscroll') {
            this.isAdd = false;
        }
    }

    private onActionBegin(e?: NotifyArgs): void {
        //Update property silently..
        this.parent.setProperties({ pageSettings: { currentPage: 1 } }, true);
    }

    public getRows(): Row<Column>[] {
        return this.vgenerator.getRows();
    }

    public getRowByIndex(index: number): Element {
        if (isGroupAdaptive(this.parent)) {
            return this.parent.getDataRows()[index];
        }
        return this.getRowCollection(index, false) as Element;
    }

    public getMovableVirtualRowByIndex(index: number): Element {
        return this.getRowCollection(index, true) as Element;
    }

    public getFrozenRightVirtualRowByIndex(index: number): Element {
        return this.getRowCollection(index, false, false, true) as Element;
    }

    public getRowCollection(index: number, isMovable: boolean, isRowObject?: boolean, isFrozenRight?: boolean): Element | Object {
        let prev: number[] = this.prevInfo.blockIndexes;
        let startIdx: number = (!isBlazor() || (isBlazor() && !this.parent.isServerRendered)) ?
            (prev[0] - 1) * this.getBlockSize() : this.startIndex;
        let rowCollection: Element[] = isMovable ? this.parent.getMovableDataRows() : this.parent.getDataRows();
        rowCollection = isFrozenRight ? this.parent.getFrozenRightDataRows() : rowCollection;
        let collection: Element[] | Object[] = isRowObject ? this.parent.getCurrentViewRecords() : rowCollection;
        let selectedRow: Element | Object = collection[index - startIdx];
        if (this.parent.frozenRows && this.parent.pageSettings.currentPage > 1) {
            if (!isRowObject) {
                selectedRow = index <= this.parent.frozenRows ? rowCollection[index]
                    : rowCollection[(index - startIdx) + this.parent.frozenRows];
            } else {
                selectedRow = index <= this.parent.frozenRows ? this.parent.getRowsObject()[index].data : selectedRow;
            }
        }
        return selectedRow;
    }

    public getVirtualRowIndex(index: number): number {
        let prev: number[] = this.prevInfo.blockIndexes;
        let startIdx: number = (prev[0] - 1) * this.getBlockSize();
        return startIdx + index;
    }

    /** @hidden */
    public refreshOffsets(): void {
        let gObj: IGrid = this.parent;
        let row: number = 0; let bSize: number = this.getBlockSize();
        let total: number = isGroupAdaptive(this.parent) ? this.getGroupedTotalBlocks() : this.getTotalBlocks();
        this.prevHeight = this.offsets[total]; this.maxBlock = total % 2 === 0 ? total - 2 : total - 1; this.offsets = {};
        //Row offset update
        let blocks: number[] = Array.apply(null, Array(total)).map(() => ++row);
        for (let i: number = 0; i < blocks.length; i++) {
            let tmp: number = (this.vgenerator.cache[blocks[i]] || []).length;
            let rem: number = !isGroupAdaptive(this.parent) ? this.count % bSize : (gObj.vcRows.length % bSize);
            let size: number = !isGroupAdaptive(this.parent) && blocks[i] in this.vgenerator.cache ?
                tmp * this.parent.getRowHeight() : rem && blocks[i] === total ? rem * this.parent.getRowHeight() :
                this.getBlockHeight();
                // let size: number = this.parent.groupSettings.columns.length && block in this.vgenerator.cache ?
                // tmp * getRowHeight() : this.getBlockHeight();
            this.offsets[blocks[i]] = (this.offsets[blocks[i] - 1] | 0) + size;
            this.tmpOffsets[blocks[i]] = this.offsets[blocks[i] - 1] | 0;
        }
        this.offsetKeys = Object.keys(this.offsets);
        if (isGroupAdaptive(this.parent)) {
            this.parent.vGroupOffsets = this.offsets;
        }
        //Column offset update
        if (this.parent.enableColumnVirtualization) {
            this.vgenerator.refreshColOffsets();
        }
    }

    public refreshVirtualElement(): void {
        this.vgenerator.refreshColOffsets();
        this.setVirtualHeight();
    }

    public setVisible(columns?: Column[]): void {
        let gObj: IGrid = this.parent;
        let frozenCols: number = this.parent.getFrozenColumns();
        let fcntColGrp: HTMLCollection;
        let mcntColGrp: HTMLCollection;

        if (frozenCols) {
            fcntColGrp = [].slice.call(this.parent.getFrozenVirtualContent().querySelectorAll('col'));
            mcntColGrp = [].slice.call(this.parent.getMovableVirtualContent().querySelectorAll('col'));
        }
        if (isBlazor() && gObj.isServerRendered) {
            this.parent.notify('setvisibility', columns);
        }
        let rows: Row<Column>[] = [];
        rows = <Row<Column>[]>this.getRows();
        let testRow: Row<Column>;
        rows.some((r: Row<Column>) => { if (r.isDataRow) { testRow = r; } return r.isDataRow; });

        let needFullRefresh: boolean = true;
        if (!gObj.groupSettings.columns.length && testRow) {
            needFullRefresh = false;
        }
        let tr: Object = gObj.getDataRows();
        for (let c: number = 0, clen: number = columns.length; c < clen; c++) {
            let column: Column = columns[c];
            let idx: number = gObj.getNormalizedColumnIndex(column.uid);
            let displayVal: string = column.visible === true ? '' : 'none';

            let colGrp: HTMLCollection;
            if (fcntColGrp && mcntColGrp) {
                if (idx >= frozenCols) {
                    colGrp = mcntColGrp;
                    tr = this.parent.getMovableRows();
                    idx = idx - frozenCols;
                } else {
                    colGrp = fcntColGrp;
                }
            } else {
                colGrp = this.getColGroup().children;
            }

            if (idx !== -1 && testRow && idx < testRow.cells.length) {
                setStyleAttribute(colGrp[idx] as HTMLElement, { 'display': displayVal });
            }
            if (!needFullRefresh) {
                let width: number;
                if (column.visible) {
                    width = this.virtualEle.wrapper.offsetWidth + parseInt(column.width.toString(), 10);
                } else {
                    width = this.virtualEle.wrapper.offsetWidth - parseInt(column.width.toString(), 10);
                }
                if (width > gObj.width) {
                    this.setDisplayNone(tr, idx, displayVal, rows);
                    if (this.parent.enableColumnVirtualization) {
                        this.virtualEle.setWrapperWidth(width + '');
                    }
                    this.refreshVirtualElement();
                } else {
                    needFullRefresh = true;
                }
            }
            if (!this.parent.invokedFromMedia && column.hideAtMedia) {
                this.parent.updateMediaColumns(column);
            }
            this.parent.invokedFromMedia = false;
        }
        if (isBlazor() && this.parent.isServerRendered && needFullRefresh) {
            let inViewIdx: number[] = (<{inViewIndexes?: number[]}>this.parent).inViewIndexes;
            let translateX: number = this.getColumnOffset(inViewIdx[0] - 1);
            let width: string = this.getColumnOffset(inViewIdx[inViewIdx.length - 1]) - translateX + '';
            this.parent.notify('refresh-virtual-indices', { requestType: 'virtualScrollRefresh',
            startColumnIndex: inViewIdx[0], endColumnIndex: inViewIdx[inViewIdx.length - 1], axis: 'X',
            VTablewidth: width, translateX: translateX});
            this.parent.notify('setcolumnstyles', {});
        }
        if (needFullRefresh || frozenCols) {
            this.refreshContentRows({ requestType: 'refresh' });
        } else {
            this.parent.notify(events.partialRefresh, { rows: rows, args: { isFrozen: false, rows: rows } });
        }
    }

    private selectVirtualRow(args: { selectedIndex: number }): void {
        if (this.activeKey !== 'upArrow' && this.activeKey !== 'downArrow'
            && !this.requestTypes.some((value: string) => value === this.requestType) && !this.parent.selectionModule.isInteracted) {
            let selectedRow: Element = this.parent.getRowByIndex(args.selectedIndex);
            let rowHeight: number = this.parent.getRowHeight();
            if (!selectedRow || !this.isRowInView(selectedRow)) {
                this.isSelection = true;
                this.selectedRowIndex = args.selectedIndex;
                let scrollTop: number = (args.selectedIndex + 1) * rowHeight;
                if (!isNullOrUndefined(scrollTop)) {
                    this.content.scrollTop = scrollTop;
                }
            }
        }
        if (this.parent.isFrozenGrid() && this.requestType) {
            if (this.parent.getTablesCount() === this.frzIdx) {
                this.requestType = this.empty as string;
                this.frzIdx = 1;
            } else {
                this.frzIdx++;
            }
        } else {
            this.requestType = this.empty as string;
        }
    }

    private isRowInView(row: Element): boolean {
        let top: number = row.getBoundingClientRect().top;
        return (top >= this.initialRowTop && top <= this.content.offsetHeight);
    }
}
/**
 * @hidden
 */
export class VirtualHeaderRenderer extends HeaderRender implements IRenderer {
    public virtualEle: VirtualElementHandler = new VirtualElementHandler();
    /** @hidden */
    public gen: VirtualRowModelGenerator;
    public movableTbl: Element;
    private isMovable: boolean = false;

    constructor(parent: IGrid, locator: ServiceLocator) {
        super(parent, locator);
        this.gen = new VirtualRowModelGenerator(this.parent);
        this.parent.on(events.columnVisibilityChanged, this.setVisible, this);
        this.parent.on(refreshVirtualBlock, (e?: NotifyArgs) => e.virtualInfo.sentinelInfo.axis === 'X' ? this.refreshUI() : null, this);
    }

    public renderTable(): void {
        this.gen.refreshColOffsets();
        this.parent.setColumnIndexesInView(this.gen.getColumnIndexes(<HTMLElement>this.getPanel().querySelector('.e-headercontent')));
        if (isBlazor() && this.parent.isServerRendered) {
            this.parent.notify('refresh-virtual-indices', {
                startColumnIndex: (<VirtualContentRenderer>this.parent.contentModule).startColIndex,
                endColumnIndex: (<VirtualContentRenderer>this.parent.contentModule).endColIndex, axis: 'X'
            });
        }
        super.renderTable();
        this.virtualEle.table = <HTMLElement>this.getTable();
        this.virtualEle.content = <HTMLElement>this.getPanel().querySelector('.e-headercontent');
        this.virtualEle.content.style.position = 'relative';
        this.virtualEle.renderWrapper();
        this.virtualEle.renderPlaceHolder('absolute');
    }

    public appendContent(table: Element): void {
        if (!this.isMovable) {
            this.virtualEle.wrapper.appendChild(table);
        } else {
            this.virtualEle.movableWrapper.appendChild(table);
            this.isMovable = false;
        }
    }

    public refreshUI(): void {
        this.isMovable = this.parent.isFrozenGrid();
        this.setFrozenTable(this.parent.getMovableVirtualContent());
        this.gen.refreshColOffsets();
        this.parent.setColumnIndexesInView(this.gen.getColumnIndexes(<HTMLElement>this.getPanel().querySelector('.e-headercontent')));
        super.refreshUI();
        this.setFrozenTable(this.parent.getFrozenVirtualContent());
    }

    public setVisible(columns?: Column[]): void {
        let gObj: IGrid = this.parent;
        let displayVal: string;
        let idx: number;
        let needFullRefresh: boolean;
        let frozenCols: number = this.parent.getFrozenColumns();
        let fhdrColGrp: HTMLCollection;
        let mhdrColGrp: HTMLCollection;

        if (frozenCols) {
            fhdrColGrp = [].slice.call(this.parent.getFrozenVirtualHeader().querySelectorAll('col'));
            mhdrColGrp = [].slice.call(this.parent.getMovableVirtualHeader().querySelectorAll('col'));
        }
        for (let c: number = 0, clen: number = columns.length; c < clen; c++) {
            let column: Column = columns[c];
            idx = gObj.getNormalizedColumnIndex(column.uid);
            displayVal = column.visible ? '' : 'none';

            let colGrp: HTMLCollection;
            if (fhdrColGrp && mhdrColGrp) {
                if (idx >= frozenCols) {
                    colGrp = mhdrColGrp;
                    idx = idx - frozenCols;
                } else {
                    colGrp = fhdrColGrp;
                }
            } else {
                colGrp = this.getColGroup().children;
            }
            setStyleAttribute(<HTMLElement>colGrp[idx], { 'display': displayVal });
            if (gObj.enableColumnVirtualization && !gObj.groupSettings.columns.length) {
                let tablewidth: number;
                if (column.visible) {
                    tablewidth = this.virtualEle.wrapper.offsetWidth + parseInt(column.width.toString(), 10);
                } else {
                    tablewidth = this.virtualEle.wrapper.offsetWidth - parseInt(column.width.toString(), 10);
                }
                if (tablewidth > gObj.width) {
                    this.setDisplayNone(column, displayVal);
                    this.virtualEle.setWrapperWidth(tablewidth + '');
                    this.gen.refreshColOffsets();
                } else {
                    needFullRefresh = true;
                }
            } else {
                needFullRefresh = true;
            }
            if (needFullRefresh && !frozenCols) {
                this.refreshUI();
            }
        }
        if (frozenCols) {
            this.parent.notify(events.columnPositionChanged, {});
        }
    }

    private setFrozenTable(content: Element): void {
        if (this.parent.isFrozenGrid() && this.parent.enableColumnVirtualization
            && (<{ isXaxis?: Function }>this.parent.contentModule).isXaxis()) {
            (<{ setTable?: Function }>(<Grid>this.parent).contentModule)
                .setTable(content.querySelector('.e-table'));
        }
    }

    private setDisplayNone(col: Column, displayVal: string): void {
        let frozenCols: boolean = this.parent.isFrozenGrid();
        let table: Element = this.getTable();
        if (frozenCols && col.getFreezeTableName() === 'movable') {
            table = this.parent.getMovableVirtualHeader().querySelector('.e-table');
        }
        for (let ele of [].slice.apply(table.querySelectorAll('th.e-headercell'))) {
            if (ele.querySelector('[e-mappinguid]') &&
                ele.querySelector('[e-mappinguid]').getAttribute('e-mappinguid') === col.uid) {
                setStyleAttribute(<HTMLElement>ele, { 'display': displayVal });
                if (displayVal === '') {
                    removeClass([ele], 'e-hide');
                }
                break;
            }
        }
    }
}
/**
 * @hidden
 */
export class VirtualElementHandler {
    public wrapper: HTMLElement;
    public placeholder: HTMLElement;
    public content: HTMLElement;
    public table: HTMLElement;
    public movableWrapper: HTMLElement;
    public movablePlaceholder: HTMLElement;
    public movableTable: HTMLElement;
    public movableContent: HTMLElement;

    public renderWrapper(height?: number): void {
        if (isBlazor()) {
            this.wrapper = this.content.querySelector('.e-virtualtable') ? this.content.querySelector('.e-virtualtable') :
            createElement('div', { className: 'e-virtualtable'});
            this.wrapper.setAttribute('styles', `min-height:${formatUnit(height)}`);
        } else {
            this.wrapper = createElement('div', { className: 'e-virtualtable', styles: `min-height:${formatUnit(height)}` });
        }
        this.wrapper.appendChild(this.table);
        this.content.appendChild(this.wrapper);
    }

    public renderPlaceHolder(position: string = 'relative'): void {
        if (isBlazor()) {
            this.placeholder = this.content.querySelector('.e-virtualtrack') ? this.content.querySelector('.e-virtualtrack') :
            createElement('div', { className: 'e-virtualtrack' });
            this.placeholder.setAttribute('styles', `position:${position}`);
        } else {
            this.placeholder = createElement('div', { className: 'e-virtualtrack', styles: `position:${position}` });
        }
        this.content.appendChild(this.placeholder);
    }

    public renderFrozenWrapper(height?: number): void {
        this.wrapper = createElement('div', { className: 'e-virtualtable', styles: `min-height:${formatUnit(height)}; display: flex` });
        this.content.appendChild(this.wrapper);
    }

    public renderFrozenPlaceHolder(): void {
        this.placeholder = createElement('div', { className: 'e-virtualtrack' });
        this.content.appendChild(this.placeholder);
    }

    public renderMovableWrapper(height?: number): void {
        this.movableWrapper = createElement('div', { className: 'e-virtualtable', styles: `min-height:${formatUnit(height)}` });
        this.movableContent.appendChild(this.movableWrapper);
    }

    public renderMovablePlaceHolder(): void {
        this.movablePlaceholder = createElement('div', { className: 'e-virtualtrack' });
        this.movableContent.appendChild(this.movablePlaceholder);
    }

    public adjustTable(xValue: number, yValue: number): void {
        this.wrapper.style.transform = `translate(${xValue}px, ${yValue}px)`;
    }

    public adjustMovableTable(xValue: number, yValue: number): void {
        this.movableWrapper.style.transform = `translate(${xValue}px, ${yValue}px)`;
    }

    public setMovableWrapperWidth(width: string, full?: boolean): void {
        this.movableWrapper.style.width = width ? `${width}px` : full ? '100%' : '';
    }

    public setMovableVirtualHeight(height?: number, width?: string): void {
        this.movablePlaceholder.style.height = `${height}px`;
        this.movablePlaceholder.style.width = width;
    }

    public setWrapperWidth(width: string, full?: boolean): void {
        this.wrapper.style.width = width ? `${width}px` : full ? '100%' : '';
    }

    public setVirtualHeight(height?: number, width?: string): void {
        this.placeholder.style.height = `${height}px`;
        this.placeholder.style.width = width;
    }

    public setFreezeWrapperWidth(wrapper: HTMLElement, width: string, full?: boolean): void {
        wrapper.style.width = width ? `${width}px` : full ? '100%' : '';
    }
}

type ScrollArg = { direction: string, sentinel: SentinelType, offset: Offsets, focusElement: HTMLElement };

interface EditArgs {
    data?: Object;
    requestType?: string;
    previousData?: Object;
    selectedRow?: Number;
    type?: string;
    promise?: Promise<Object>;
    row?: Element;
}
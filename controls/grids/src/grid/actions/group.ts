import { MouseEventArgs, Draggable, Droppable, L10n, DropEventArgs, KeyboardEventArgs, isBlazor } from '@syncfusion/ej2-base';
import { createElement, closest, remove, classList, addClass, removeClass, BlazorDragEventArgs } from '@syncfusion/ej2-base';
import { isNullOrUndefined, extend } from '@syncfusion/ej2-base';
import { Column } from '../models/column';
import { GroupSettingsModel, SortDescriptorModel } from '../base/grid-model';
import { parentsUntil, isActionPrevent, isGroupAdaptive, updatecloneRow } from '../base/util';
import { ReturnType } from '../base/type';
import { Action, AggregateType } from '../base/enum';
import { ServiceLocator } from '../services/service-locator';
import { IGrid, IAction, NotifyArgs } from '../base/interface';
import * as events from '../base/constant';
import { AriaService } from '../services/aria-service';
import { FocusStrategy } from '../services/focus-strategy';
import { GroupModelGenerator } from '../services/group-model-generator';
import { DataUtil, Query } from '@syncfusion/ej2-data';
import { AggregateColumn, AggregateRow } from '../models/aggregate';
import { Row } from '../models/row';
import { Cell } from '../models/cell';
import { Grid } from '../base/grid';
import { GroupLazyLoadRenderer } from '../renderer/group-lazy-load-renderer';

/**
 * 
 * The `Group` module is used to handle group action.
 */
export class Group implements IAction {
    //Internal variables
    private sortRequired: boolean = true;
    private groupSettings: GroupSettingsModel;
    private element: HTMLElement;
    private colName: string;
    private column: Column;
    private isAppliedGroup: boolean = false;
    private isAppliedUnGroup: boolean = false;
    private reorderingColumns: string[] = [];
    private groupGenerator: GroupModelGenerator;
    private visualElement: HTMLElement = createElement('div', {
        className: 'e-cloneproperties e-dragclone e-gdclone',
        styles: 'line-height:23px', attrs: { action: 'grouping' }
    });
    private helper: Function = (e: { sender: MouseEvent }) => {
        let gObj: IGrid = this.parent;
        let target: Element = (e.sender.target as Element);
        let element: HTMLElement = target.classList.contains('e-groupheadercell') ? target as HTMLElement :
            parentsUntil(target, 'e-groupheadercell') as HTMLElement;
        if (!element || (!target.classList.contains('e-drag') && this.groupSettings.allowReordering)) {
            return false;
        }
        this.column = gObj.getColumnByField(element.firstElementChild.getAttribute('ej-mappingname'));
        this.visualElement.textContent = element.textContent;
        this.visualElement.style.width = element.offsetWidth + 2 + 'px';
        this.visualElement.style.height = element.offsetHeight + 2 + 'px';
        this.visualElement.setAttribute('e-mappinguid', this.column.uid);
        gObj.element.appendChild(this.visualElement);
        return this.visualElement;
    }
    private dragStart: Function = (e: BlazorDragEventArgs): void => {
        this.parent.element.classList.add('e-ungroupdrag');
        if (isBlazor()) {
            e.bindEvents(e.dragElement);
        }
    }
    private drag: Function = (e: { target: HTMLElement, event: MouseEventArgs }): void => {
        if (this.groupSettings.allowReordering) {
            this.animateDropper(e);
        }
        let target: Element = e.target;
        let cloneElement: HTMLElement = this.parent.element.querySelector('.e-cloneproperties') as HTMLElement;
        this.parent.trigger(events.columnDrag, { target: target, draggableType: 'headercell', column: this.column });
        if (!this.groupSettings.allowReordering) {
            classList(cloneElement, ['e-defaultcur'], ['e-notallowedcur']);
            if (!(parentsUntil(target as Element, 'e-gridcontent') || parentsUntil(target as Element, 'e-headercell'))) {
                classList(cloneElement, ['e-notallowedcur'], ['e-defaultcur']);
            }
        }
    }
    private dragStop: Function = (e: { target: HTMLElement, event: MouseEventArgs, helper: Element }) => {
        this.parent.element.classList.remove('e-ungroupdrag');
        let preventDrop: boolean = !(parentsUntil(e.target, 'e-gridcontent') || parentsUntil(e.target, 'e-gridheader'));
        if (this.groupSettings.allowReordering && preventDrop) {
            remove(e.helper);
            if (parentsUntil(e.target, 'e-groupdroparea')) {
                this.rearrangeGroup(e);
            } else if (!(parentsUntil(e.target, 'e-grid'))) {
                let field: string = this.parent.getColumnByUid(e.helper.getAttribute('e-mappinguid')).field;
                if (this.groupSettings.columns.indexOf(field) !== -1) {
                    this.ungroupColumn(field);
                }
            }
            return;
        } else if (preventDrop) {
            remove(e.helper);
            return;
        }
    }
    private animateDropper: Function = (e: { target: HTMLElement, event: MouseEventArgs, helper: Element }) => {
        let uid: string = this.parent.element.querySelector('.e-cloneproperties').getAttribute('e-mappinguid');
        let dragField: string = this.parent.getColumnByUid(uid).field;
        let parent: Element = parentsUntil(e.target, 'e-groupdroparea');
        let dropTarget: Element = parentsUntil(e.target, 'e-group-animator');
        // tslint:disable-next-line
        let grouped: string[] = [].slice.call(this.element.querySelectorAll('.e-groupheadercell'))
            .map((e: Element) => e.querySelector('div').getAttribute('ej-mappingname'));
        let cols: string[] = JSON.parse(JSON.stringify(grouped));
        if (dropTarget || parent) {
            if (dropTarget) {
                let dropField: string = dropTarget.querySelector('div[ej-mappingname]').getAttribute('ej-mappingname');
                let dropIndex: number = +(dropTarget.getAttribute('index'));
                if (dropField !== dragField) {
                    let dragIndex: number = cols.indexOf(dragField);
                    if (dragIndex !== -1) {
                        cols.splice(dragIndex, 1);
                    }
                    let flag: boolean = dropIndex !== -1 && dragIndex === dropIndex;
                    cols.splice(dropIndex + (flag ? 1 : 0), 0, dragField);
                }
            } else if (parent && cols.indexOf(dragField) === -1) {
                cols.push(dragField);
            }
            this.element.innerHTML = '';
            if (cols.length && !this.element.classList.contains('e-grouped')) {
                this.element.classList.add('e-grouped');
            }
            this.reorderingColumns = cols;
            for (let c: number = 0; c < cols.length; c++) {
                this.addColToGroupDrop(cols[c]);
            }
        } else {
            this.addLabel();
            this.removeColFromGroupDrop(dragField);
        }

    }
    private addLabel(): void {
        if (!this.element.querySelectorAll('.e-group-animator').length) {
            let dragLabel: string = this.l10n.getConstant('GroupDropArea');
            this.element.innerHTML = dragLabel;
            this.element.classList.remove('e-grouped');
        }
    }
    private rearrangeGroup(e: { target: HTMLElement, event: MouseEventArgs, helper: Element }): void {
        this.sortRequired = false;
        this.updateModel();
    }
    private drop: Function = (e: DropEventArgs) => {
        let gObj: IGrid = this.parent;
        let column: Column = gObj.getColumnByUid(e.droppedElement.getAttribute('e-mappinguid'));
        this.element.classList.remove('e-hover');
        remove(e.droppedElement);
        this.aria.setDropTarget(<HTMLElement>this.parent.element.querySelector('.e-groupdroparea'), false);
        this.aria.setGrabbed(<HTMLElement>this.parent.getHeaderTable().querySelector('[aria-grabbed=true]'), false);
        if (isNullOrUndefined(column) || column.allowGrouping === false ||
            parentsUntil(gObj.getColumnHeaderByUid(column.uid), 'e-grid').getAttribute('id') !==
            gObj.element.getAttribute('id')) {
            this.parent.log('action_disabled_column', { moduleName: this.getModuleName(), columnName: column.headerText });
            return;
        }
        this.groupColumn(column.field);
    }
    //Module declarations
    private parent: IGrid;
    private serviceLocator: ServiceLocator;
    private contentRefresh: boolean = true;
    private sortedColumns: string[];
    private l10n: L10n;
    private aria: AriaService = new AriaService();
    private focus: FocusStrategy;

    /**
     * Constructor for Grid group module
     * @hidden
     */
    constructor(parent?: IGrid, groupSettings?: GroupSettingsModel, sortedColumns?: string[], serviceLocator?: ServiceLocator) {
        this.parent = parent;
        this.groupSettings = groupSettings;
        this.serviceLocator = serviceLocator;
        this.sortedColumns = sortedColumns;
        this.focus = serviceLocator.getService<FocusStrategy>('focus');
        this.addEventListener();
        this.groupGenerator = new GroupModelGenerator(this.parent);
    }

    private columnDrag(e: { target: Element }): void {
        if (this.groupSettings.allowReordering) {
            this.animateDropper(e);
        }
        let gObj: IGrid = this.parent;
        let cloneElement: HTMLElement = this.parent.element.querySelector('.e-cloneproperties') as HTMLElement;
        classList(cloneElement, ['e-defaultcur'], ['e-notallowedcur']);
        if (!parentsUntil(e.target as Element, 'e-groupdroparea') &&
            !(this.parent.allowReordering && parentsUntil(e.target as Element, 'e-headercell'))) {
            classList(cloneElement, ['e-notallowedcur'], ['e-defaultcur']);
        }
        e.target.classList.contains('e-groupdroparea') ? this.element.classList.add('e-hover') : this.element.classList.remove('e-hover');
    }

    private columnDragStart(e: { target: Element, column: Column }): void {
        if (e.target.classList.contains('e-stackedheadercell')) {
            return;
        }
        let gObj: IGrid = this.parent;
        let dropArea: HTMLElement = <HTMLElement>this.parent.element.querySelector('.e-groupdroparea');
        this.aria.setDropTarget(dropArea, e.column.allowGrouping);
        let element: Element = e.target.classList.contains('e-headercell') ? e.target : parentsUntil(e.target as Element, 'e-headercell');
        this.aria.setGrabbed(<HTMLElement>element, true, !e.column.allowGrouping);
    }

    private columnDrop(e: { target: Element, droppedElement: HTMLElement }): void {
        let gObj: IGrid = this.parent;
        if (e.droppedElement.getAttribute('action') === 'grouping') {
            let column: Column = gObj.getColumnByUid(e.droppedElement.getAttribute('e-mappinguid'));
            if (isNullOrUndefined(column) || column.allowGrouping === false ||
                parentsUntil(gObj.getColumnHeaderByUid(column.uid), 'e-grid').getAttribute('id') !==
                gObj.element.getAttribute('id')) {
                return;
            }
            this.ungroupColumn(column.field);
        }
    }

    /**
     * @hidden
     */
    public addEventListener(): void {
        if (this.parent.isDestroyed) { return; }
        this.parent.on(events.uiUpdate, this.enableAfterRender, this);
        this.parent.on(events.groupComplete, this.onActionComplete, this);
        this.parent.on(events.ungroupComplete, this.onActionComplete, this);
        this.parent.on(events.inBoundModelChanged, this.onPropertyChanged, this);
        this.parent.on(events.click, this.clickHandler, this);
        this.parent.on(events.columnDrag, this.columnDrag, this);
        this.parent.on(events.columnDragStart, this.columnDragStart, this);
        this.parent.on(events.headerDrop, this.columnDrop, this);
        this.parent.on(events.columnDrop, this.columnDrop, this);
        this.parent.on(events.headerRefreshed, this.refreshSortIcons, this);
        this.parent.on(events.sortComplete, this.refreshSortIcons, this);
        this.parent.on(events.keyPressed, this.keyPressHandler, this);
        this.parent.on(events.contentReady, this.initialEnd, this);
        this.parent.on(events.onEmpty, this.initialEnd, this);
        this.parent.on(events.initialEnd, this.render, this);
        this.parent.on(events.groupAggregates, this.onGroupAggregates, this);
        this.parent.on('blazor-action-begin', this.blazorActionBegin, this);
        this.parent.on('group-expand-collapse', this.updateExpand, this);
        this.parent.on('persist-data-changed', this.initialEnd, this);
    }
    /**
     * @hidden
     */
    public removeEventListener(): void {
        if (this.parent.isDestroyed) { return; }
        this.parent.off(events.initialEnd, this.render);
        this.parent.off(events.uiUpdate, this.enableAfterRender);
        this.parent.off(events.groupComplete, this.onActionComplete);
        this.parent.off(events.ungroupComplete, this.onActionComplete);
        this.parent.off(events.inBoundModelChanged, this.onPropertyChanged);
        this.parent.off(events.click, this.clickHandler);
        this.parent.off(events.columnDrag, this.columnDrag);
        this.parent.off(events.columnDragStart, this.columnDragStart);
        this.parent.off(events.columnDrop, this.columnDrop);
        this.parent.off(events.headerDrop, this.columnDrop);
        this.parent.off(events.headerRefreshed, this.refreshSortIcons);
        this.parent.off(events.sortComplete, this.refreshSortIcons);
        this.parent.off(events.keyPressed, this.keyPressHandler);
        this.parent.off(events.groupAggregates, this.onGroupAggregates);
        this.parent.off('blazor-action-begin', this.blazorActionBegin);
        this.parent.off('group-expand-collapse', this.updateExpand);
    }

    private blazorActionBegin(): void {
        if (this.parent.allowGrouping && !this.parent.isCollapseStateEnabled()) {
            this.expandAll();
        }
    }

    private initialEnd(): void {
        let gObj: IGrid = this.parent;
        this.parent.off(events.contentReady, this.initialEnd);
        this.parent.off(events.onEmpty, this.initialEnd);
        if (isBlazor() && gObj.isServerRendered) {
            for (let i: number = 0; i < gObj.columns.length; i++) {
                this.removeColFromGroupDrop((gObj.columns[i] as Column).field);
            }
            this.updateGroupDropArea();
        }
        if (this.parent.getColumns().length && this.groupSettings.columns.length) {
            this.contentRefresh = false;
            for (let col of gObj.groupSettings.columns) {
                this.groupColumn(col);
            }
            this.contentRefresh = true;
        }
    }

    private keyPressHandler(e: KeyboardEventArgs): void {
        let gObj: IGrid = this.parent;
        if (e.action !== 'ctrlSpace' && (!this.groupSettings.columns.length ||
            ['altDownArrow', 'altUpArrow', 'ctrlDownArrow', 'ctrlUpArrow', 'enter'].indexOf(e.action) === -1)) {
            return;
        }
        e.preventDefault();
        switch (e.action) {
            case 'altDownArrow':
            case 'altUpArrow':
                let selected: number[] = gObj.allowSelection ? gObj.getSelectedRowIndexes() : [];
                if (selected.length) {
                    let rows: HTMLCollection = gObj.getContentTable().querySelector('tbody').children;
                    let dataRow: HTMLTableRowElement = gObj.getDataRows()[selected[selected.length - 1]] as HTMLTableRowElement;
                    let grpRow: Element;
                    for (let i: number = dataRow.rowIndex; i >= 0; i--) {
                        if (!rows[i].classList.contains('e-row') && !rows[i].classList.contains('e-detailrow')) {
                            grpRow = rows[i];
                            break;
                        }
                    }
                    this.expandCollapseRows(grpRow.querySelector(e.action === 'altUpArrow' ?
                        '.e-recordplusexpand' : '.e-recordpluscollapse'));
                }
                break;
            case 'ctrlDownArrow':
                this.expandAll();
                break;
            case 'ctrlUpArrow':
                this.collapseAll();
                break;
            case 'enter':
                if (this.parent.isEdit || (closest(e.target as Element, '#' + this.parent.element.id + '_searchbar') !== null)) { return; }
                let element: HTMLElement = this.focus.getFocusedElement();
                let row: Element = element ? element.parentElement.querySelector('[class^="e-record"]') : null;
                if (!row) { break; }
                this.expandCollapseRows(row);
                break;
            case 'ctrlSpace':
                let elem: HTMLElement = gObj.focusModule.currentInfo.element;
                if (elem && elem.classList.contains('e-headercell')) {
                    let column: Column = gObj.getColumnByUid(elem.firstElementChild.getAttribute('e-mappinguid'));
                    column.field && gObj.groupSettings.columns.indexOf(column.field) < 0 ?
                        this.groupColumn(column.field) : this.ungroupColumn(column.field);
                }
                break;

        }
    }


    private clickHandler(e: MouseEventArgs): void {
        this.expandCollapseRows(e.target as Element);
        this.applySortFromTarget(e.target as Element);
        this.unGroupFromTarget(e.target as Element);
        this.toogleGroupFromHeader(e.target as Element);
    }

    private unGroupFromTarget(target: Element): void {
        if (target.classList.contains('e-ungroupbutton')) {
            this.ungroupColumn(target.parentElement.getAttribute('ej-mappingname'));
        }
    }

    private toogleGroupFromHeader(target: Element): void {
        if (this.groupSettings.showToggleButton) {
            if (target.classList.contains('e-grptogglebtn')) {
                if (target.classList.contains('e-toggleungroup')) {
                    this.ungroupColumn(this.parent.getColumnByUid(target.parentElement.getAttribute('e-mappinguid')).field);
                } else {
                    this.groupColumn(this.parent.getColumnByUid(target.parentElement.getAttribute('e-mappinguid')).field);
                }
            } else {
                if (target.classList.contains('e-toggleungroup')) {
                    this.ungroupColumn(target.parentElement.getAttribute('ej-mappingname'));
                }
            }
        }
    }

    private applySortFromTarget(target: Element): void {
        let gObj: IGrid = this.parent;
        let gHeader: Element = closest(target as Element, '.e-groupheadercell');
        if (gObj.allowSorting && gHeader && !target.classList.contains('e-ungroupbutton') &&
            !target.classList.contains('e-toggleungroup')) {
            let field: string = gHeader.firstElementChild.getAttribute('ej-mappingname');
            if (gObj.getColumnHeaderByField(field).querySelectorAll('.e-ascending').length) {
                gObj.sortColumn(field, 'Descending', true);
            } else {
                gObj.sortColumn(field, 'Ascending', true);
            }
        }
    }

    /**  
     * Expands or collapses grouped rows by target element. 
     * @param  {Element} target - Defines the target element of the grouped row.      
     * @return {void}  
     */
    public expandCollapseRows(target: Element): void {
        let trgt: HTMLTableCellElement = parentsUntil(target, 'e-recordplusexpand') as HTMLTableCellElement ||
            parentsUntil(target, 'e-recordpluscollapse') as HTMLTableCellElement;
        if (trgt) {
            let cellIdx: number = trgt.cellIndex;
            let rowIdx: number = (trgt.parentElement as HTMLTableRowElement).rowIndex;
            let rowNodes: HTMLCollection = this.parent.getContentTable().querySelector('tbody').children;
            let rows: HTMLTableRowElement[] = [].slice.call(rowNodes).slice(rowIdx + 1, rowNodes.length);
            let isHide: boolean;
            let expandElem: Element;
            let dataManager: Promise<Object>;
            let query: Query;
            let toExpand: Element[] = [];
            let gObj: IGrid = this.parent;
            let indent: number = trgt.parentElement.querySelectorAll('.e-indentcell').length;
            let expand: boolean = false;
            if (isBlazor() && this.parent.isCollapseStateEnabled()) {
                this.parent.notify(
                    'group-expand-collapse',
                    {
                        uid: trgt.parentElement.getAttribute('data-uid'),
                        isExpand: trgt.classList.contains('e-recordpluscollapse')
                    });
                return;
            }
            if (trgt.classList.contains('e-recordpluscollapse')) {
                addClass([trgt], 'e-recordplusexpand'); removeClass([trgt], 'e-recordpluscollapse');
                trgt.firstElementChild.className = 'e-icons e-gdiagonaldown e-icon-gdownarrow';
                expand = true;
                if (isGroupAdaptive(gObj)) {
                    this.updateVirtualRows(gObj, target, expand, query, dataManager);
                }
                if (this.parent.groupSettings.enableLazyLoading) {
                    (this.parent.contentModule as GroupLazyLoadRenderer).captionExpand(trgt.parentElement as HTMLTableRowElement);
                }
            } else {
                isHide = true;
                removeClass([trgt], 'e-recordplusexpand'); addClass([trgt], 'e-recordpluscollapse');
                trgt.firstElementChild.className = 'e-icons e-gnextforward e-icon-grightarrow';
                if (isGroupAdaptive(gObj)) {
                    this.updateVirtualRows(gObj, target, !isHide, query, dataManager);
                }
                if (this.parent.groupSettings.enableLazyLoading) {
                    (this.parent.contentModule as GroupLazyLoadRenderer).captionCollapse(trgt.parentElement as HTMLTableRowElement);
                }
            }
            this.aria.setExpand(trgt, expand);
            if (!isGroupAdaptive(gObj) && !this.parent.groupSettings.enableLazyLoading) {
                for (let i: number = 0, len: number = rows.length; i < len; i++) {
                    if (rows[i].querySelectorAll('td')[cellIdx] &&
                        rows[i].querySelectorAll('td')[cellIdx].classList.contains('e-indentcell') && rows) {
                        if (isHide) {
                            rows[i].style.display = 'none';
                        } else {
                            if (rows[i].querySelectorAll('.e-indentcell').length === indent + 1) {
                                rows[i].style.display = '';
                                expandElem = rows[i].querySelector('.e-recordplusexpand');
                                if (expandElem) {
                                    toExpand.push(expandElem);
                                }
                                if (rows[i].classList.contains('e-detailrow')) {
                                    if (rows[i - 1].querySelectorAll('.e-detailrowcollapse').length) {
                                        rows[i].style.display = 'none';
                                    }
                                }
                            }
                        }
                    } else {
                        break;
                    }
                }
                this.updateVisibleexpandCollapseRows();
                this.parent.notify(events.refreshExpandandCollapse, { rows: this.parent.getRowsObject() });
            }
            for (let i: number = 0, len: number = toExpand.length; i < len; i++) {
                removeClass([toExpand[i]], 'e-recordplusexpand'); addClass([toExpand[i]], 'e-recordpluscollapse');
                toExpand[i].firstElementChild.className = 'e-icons e-gnextforward e-icon-grightarrow';
                this.expandCollapseRows(toExpand[i]);
            }
        }
    }

    private updateVisibleexpandCollapseRows(): void {
        let rows: Row<Column>[] = this.parent.getRowsObject();
        for (let i: number = 0, len: number = rows.length; i < len; i++) {
            if (rows[i].isDataRow && (this.parent.getRowElementByUID(rows[i].uid) as HTMLTableRowElement).style.display === 'none') {
                (<{ visible?: boolean }>rows[i]).visible = false;
            }
        }
    }

    private updateVirtualRows(gObj: IGrid, target: Element, isExpand: boolean, query: Query, dataManager: Promise<Object>): void {
        let rObj: Row<Column> = gObj.getRowObjectFromUID(target.closest('tr').getAttribute('data-uid'));
        rObj.isExpand = isExpand;
        updatecloneRow(gObj);
        this.parent.notify(events.refreshVirtualMaxPage, {});
        query = gObj.getDataModule().generateQuery(false);
        query.queries = gObj.getDataModule().aggregateQuery(gObj.getQuery().clone()).queries;
        let args: NotifyArgs = { requestType: 'virtualscroll', rowObject: rObj };
        dataManager = gObj.getDataModule().getData(args, query.requiresCount());
        dataManager.then((e: ReturnType) => gObj.renderModule.dataManagerSuccess(e, args));
    }
    private expandCollapse(isExpand: boolean): void {
        if (isBlazor() && this.parent.isCollapseStateEnabled()) {
            this.parent.notify('group-expand-collapse', { isExpand: isExpand });
            return;
        }
        if (!isExpand) {
            this.parent.notify(events.initialCollapse, isExpand);
        }
        let rowNodes: HTMLCollection = this.parent.getContentTable().querySelector('tbody').children;
        let row: Element;
        for (let i: number = 0, len: number = rowNodes.length; i < len; i++) {
            if (rowNodes[i].querySelectorAll('.e-recordplusexpand, .e-recordpluscollapse').length) {
                row = rowNodes[i].querySelector(isExpand ? '.e-recordpluscollapse' : '.e-recordplusexpand');
                if (row) {
                    row.className = isExpand ? 'e-recordplusexpand' : 'e-recordpluscollapse';
                    row.firstElementChild.className = isExpand ? 'e-icons e-gdiagonaldown e-icon-gdownarrow' :
                        'e-icons e-gnextforward e-icon-grightarrow';
                }
                if (!(rowNodes[i].firstElementChild.classList.contains('e-recordplusexpand') ||
                    rowNodes[i].firstElementChild.classList.contains('e-recordpluscollapse'))) {
                    (rowNodes[i] as HTMLElement).style.display = isExpand ? '' : 'none';
                }
            } else {
                (rowNodes[i] as HTMLElement).style.display = isExpand ? '' : 'none';
            }
        }
        this.updateVisibleexpandCollapseRows();
        this.parent.notify(events.refreshExpandandCollapse, { rows: this.parent.getRowsObject() });
    }

    /** 
     * Expands all the grouped rows of the Grid.          
     * @return {void} 
     */
    public expandAll(): void {
        this.expandCollapse(true);
    }

    /** 
     * Collapses all the grouped rows of the Grid.         
     * @return {void} 
     */
    public collapseAll(): void {
        this.expandCollapse(false);
    }

    /**
     * The function is used to render grouping
     * @return {Element} 
     * @hidden
     */
    public render(): void {
        this.l10n = this.serviceLocator.getService<L10n>('localization');
        this.renderGroupDropArea();
        this.initDragAndDrop();
        this.refreshToggleBtn();
    }

    private renderGroupDropArea(): void {
        let groupElem: Element = this.parent.element.querySelector('.e-groupdroparea');
        if (groupElem) {
            remove(groupElem);
        }
        this.element = this.parent.createElement('div', { className: 'e-groupdroparea', attrs: { 'tabindex': '-1' } });
        if (this.groupSettings.allowReordering) {
            this.element.classList.add('e-group-animate');
        }
        this.updateGroupDropArea();
        this.parent.element.insertBefore(this.element, this.parent.element.firstChild);
        if (!this.groupSettings.showDropArea) {
            this.element.style.display = 'none';
        }
    }

    private updateGroupDropArea(clear?: boolean): void {
        if (this.groupSettings.showDropArea && !this.groupSettings.columns.length) {
            let dragLabel: string = this.l10n.getConstant('GroupDropArea');
            this.element.innerHTML = dragLabel;
            this.element.classList.remove('e-grouped');
        } else {
            if ((this.element.innerHTML === this.l10n.getConstant('GroupDropArea') && (this.groupSettings.columns.length === 1
                || !this.isAppliedGroup && !this.isAppliedUnGroup)) || clear) {
                this.element.innerHTML = '';
            }
            this.element.classList.add('e-grouped');
        }
    }

    private initDragAndDrop(): void {
        this.initializeGHeaderDrop();
        this.initializeGHeaderDrag();
    }

    private initializeGHeaderDrag(): void {
        let drag: Draggable = new Draggable(this.element as HTMLElement, {
            dragTarget: this.groupSettings.allowReordering ? '.e-drag' : '.e-groupheadercell',
            distance: this.groupSettings.allowReordering ? -10 : 5,
            helper: this.helper,
            dragStart: this.dragStart,
            drag: this.drag,
            dragStop: this.dragStop
        });
    }

    private initializeGHeaderDrop(): void {
        let gObj: IGrid = this.parent;
        let drop: Droppable = new Droppable(this.element, {
            accept: '.e-dragclone',
            drop: this.drop as (e: DropEventArgs) => void
        });
    }

    /** 
     * Groups a column by column name. 
     * @param  {string} columnName - Defines the column name to group.  
     * @return {void} 
     */
    public groupColumn(columnName: string): void {
        let gObj: IGrid = this.parent;
        let column: Column = gObj.getColumnByField(columnName);
        if (isNullOrUndefined(column) || column.allowGrouping === false ||
            (this.contentRefresh && this.groupSettings.columns.indexOf(columnName) > -1)) {
            this.parent.log('action_disabled_column', { moduleName: this.getModuleName(), columnName: column.headerText });
            return;
        }
        if (isActionPrevent(gObj)) {
            gObj.notify(events.preventBatch, { instance: this, handler: this.groupColumn, arg1: columnName });
            return;
        }
        column.visible = gObj.groupSettings.showGroupedColumn;
        this.colName = columnName;
        this.isAppliedGroup = true;
        if (this.contentRefresh) {
            this.updateModel();
        } else {
            this.addColToGroupDrop(columnName);
        }
        this.updateGroupDropArea();
        this.isAppliedGroup = false;
    }

    /** 
     * Ungroups a column by column name. 
     * @param  {string} columnName - Defines the column name to ungroup.  
     * @return {void} 
     */
    public ungroupColumn(columnName: string): void {
        let gObj: IGrid = this.parent;
        let column: Column = this.parent.enableColumnVirtualization ?
            (<Column[]>this.parent.columns).filter((c: Column) => c.field === columnName)[0] : gObj.getColumnByField(columnName);
        if (isNullOrUndefined(column) || column.allowGrouping === false || this.groupSettings.columns.indexOf(columnName) < 0) {
            return;
        }
        if (isActionPrevent(gObj)) {
            gObj.notify(events.preventBatch, { instance: this, handler: this.ungroupColumn, arg1: columnName });
            return;
        }
        column.visible = true;
        if (isBlazor() && gObj.isServerRendered) {
            let setVisible: Object[] = [];
            setVisible[0] = column;
            this.parent.notify('setvisibility', setVisible);
        }
        this.colName = column.field;
        let columns: string[] = JSON.parse(JSON.stringify(this.groupSettings.columns));
        columns.splice(columns.indexOf(this.colName), 1);
        if (this.sortedColumns.indexOf(columnName) < 0) {
            for (let i: number = 0, len: number = gObj.sortSettings.columns.length; i < len; i++) {
                if (columnName === gObj.sortSettings.columns[i].field) {
                    gObj.sortSettings.columns.splice(i, 1);
                    break;
                }
            }
        }
        let isServerRendered: string = 'isServerRendered';
        if (isBlazor() && this.parent[isServerRendered]) {
            gObj.sortSettings.columns = gObj.sortSettings.columns;
        }
        if (this.groupSettings.allowReordering) {
            this.reorderingColumns = columns;
        }
        this.groupSettings.columns = columns;
        if (gObj.allowGrouping) {
            this.isAppliedUnGroup = true;
            this.parent.dataBind();
        }
    }

    /**
     * The function used to update groupSettings 
     * @return {void}
     * @hidden
     */
    public updateModel(): void {
        let gObj: IGrid = this.parent;
        let i: number = 0;
        let columns: string[] =  JSON.parse(JSON.stringify(this.groupSettings.columns));
        columns = this.reorderingColumns.length ? JSON.parse(JSON.stringify(this.reorderingColumns)) : columns;
        if (this.sortRequired) {
            if (columns.indexOf(this.colName) === -1) {
                columns.push(this.colName);
            }
            this.groupAddSortingQuery(this.colName);
        }
        this.sortRequired = true;
        this.parent.groupSettings.columns = columns;
        this.parent.dataBind();
    }

    /**
     * The function used to trigger onActionComplete
     * @return {void}
     * @hidden
     */
    public onActionComplete(e: NotifyArgs): void {
        if (isBlazor() && !this.parent.isJsComponent) {
            e.rows = null;
        }
        let gObj: IGrid = this.parent;
        if (e.requestType === 'grouping') {
            this.addColToGroupDrop(this.colName);
        } else {
            this.removeColFromGroupDrop(this.colName);
        }
        let args: Object = this.groupSettings.columns.indexOf(this.colName) > -1 ? {
            columnName: this.colName, requestType: 'grouping', type: events.actionComplete
        } : { requestType: 'ungrouping', type: events.actionComplete };
        this.parent.trigger(events.actionComplete, extend(e, args));
        this.colName = null;
    }

    private groupAddSortingQuery(colName: string): void {
        let i: number = 0;
        while (i < this.parent.sortSettings.columns.length) {
            if (this.parent.sortSettings.columns[i].field === colName) {
                break;
            }
            i++;
        }
        if (this.parent.sortSettings.columns.length === i) {
            this.parent.sortSettings.columns.push({ field: colName, direction: 'Ascending', isFromGroup: true });
            let isServerRendered: string = 'isServerRendered';
            if (isBlazor() && this.parent[isServerRendered]) {
                this.parent.sortSettings.columns = this.parent.sortSettings.columns;
            }
        } else if (!this.parent.allowSorting) {
            this.parent.sortSettings.columns[i].direction = 'Ascending';
        }
    }
    private createElement(field: string): Element {
        let gObj: IGrid = this.parent;
        let direction: string = 'Ascending';
        let animator: Element = this.parent.createElement('div', { className: 'e-grid-icon e-group-animator' });
        let groupedColumn: Element = this.parent.createElement('div', { className: 'e-grid-icon e-groupheadercell' });
        let childDiv: Element = this.parent.createElement('div', { attrs: { 'ej-mappingname': field } });

        let column: Column = this.parent.getColumnByField(field);
        //Todo headerTemplateID for grouped column, disableHtmlEncode                          
        let headerCell: Element = gObj.getColumnHeaderByUid(column.uid);
        // if (!isNullOrUndefined(column.headerTemplate)) {
        //     if (column.headerTemplate.indexOf('#') !== -1) {
        //         childDiv.innerHTML = document.querySelector(column.headerTemplate).innerHTML.trim();
        //     } else {
        //         childDiv.innerHTML = column.headerTemplate;
        //     }
        //     childDiv.firstElementChild.classList.add('e-grouptext');
        // } else {
        if (this.groupSettings.allowReordering) {
            childDiv.appendChild(this.parent.createElement(
                'span', {
                className: 'e-drag e-icons e-icon-drag', innerHTML: '&nbsp;',
                attrs: { title: 'Drag', tabindex: '-1', 'aria-label': 'Drag the grouped column' }
            }));
        }
        childDiv.appendChild(this.parent.createElement('span', {
            className: 'e-grouptext', innerHTML: column.headerText,
            attrs: { tabindex: '-1', 'aria-label': 'sort the grouped column' }
        }));
        // }

        if (this.groupSettings.showToggleButton) {
            childDiv.appendChild(this.parent.createElement(
                'span', {
                className: 'e-togglegroupbutton e-icons e-icon-ungroup e-toggleungroup', innerHTML: '&nbsp;',
                attrs: { tabindex: '-1', 'aria-label': 'ungroup button' }
            }));
        }

        if (headerCell.querySelectorAll('.e-ascending,.e-descending').length) {
            direction = headerCell.querySelector('.e-ascending') ? 'Ascending' : 'Descending';
        }
        childDiv.appendChild(this.parent.createElement(
            'span', {
            className: 'e-groupsort e-icons ' +
                ('e-' + direction.toLowerCase() + ' e-icon-' + direction.toLowerCase()), innerHTML: '&nbsp;',
            attrs: { tabindex: '-1', 'aria-label': 'sort the grouped column' }
        }));
        childDiv.appendChild(this.parent.createElement(
            'span', {
            className: 'e-ungroupbutton e-icons e-icon-hide', innerHTML: '&nbsp;',
            attrs: { title: isBlazor() ? this.l10n.getConstant('UnGroupButton') : this.l10n.getConstant('UnGroup'),
            tabindex: '-1', 'aria-label': 'ungroup the grouped column' },
            styles: this.groupSettings.showUngroupButton ? '' : 'display:none'
        }));

        groupedColumn.appendChild(childDiv);
        let index: number = this.groupSettings.columns.indexOf(field);
        if (this.groupSettings.allowReordering) {
            animator.appendChild(groupedColumn);
            animator.appendChild(this.createSeparator());
            groupedColumn = animator;
        }
        return groupedColumn;
    }
    private addColToGroupDrop(field: string): void {
        if (this.groupSettings.allowReordering
            && this.parent.element.querySelector('.e-groupdroparea div[ej-mappingname=' + field + ']')) {
            return;
        }
        let column: Column = this.parent.getColumnByField(field);
        if (isNullOrUndefined(column)) {
            return;
        }
        let groupedColumn: Element = this.createElement(field);
        if (this.groupSettings.allowReordering) {
            let index: number = this.element.querySelectorAll('.e-group-animator').length;
            groupedColumn.setAttribute('index', index.toString());
        }
        this.element.appendChild(groupedColumn);

        //Todo:  rtl 
    }
    private createSeparator(): Element {
        return this.parent.createElement('span', {
            className: 'e-nextgroup e-icons e-icon-next', innerHTML: '&nbsp;',
            attrs: { tabindex: '-1', 'aria-label': 'Separator for the grouped columns' },
            styles: this.groupSettings.showUngroupButton ? '' : 'display:none'
        });
    }
    private refreshToggleBtn(isRemove?: boolean): void {
        if (this.groupSettings.showToggleButton) {
            let headers: Element[] = [].slice.call(this.parent.getHeaderTable().getElementsByClassName('e-headercelldiv'));
            for (let i: number = 0, len: number = headers.length; i < len; i++) {
                if (!((headers[i].classList.contains('e-emptycell')) || (headers[i].classList.contains('e-headerchkcelldiv')))) {
                    let column: Column = this.parent.getColumnByUid(headers[i].getAttribute('e-mappinguid'));
                    if (!this.parent.showColumnMenu || (this.parent.showColumnMenu && !column.showColumnMenu)) {
                        if (headers[i].querySelectorAll('.e-grptogglebtn').length) {
                            remove(headers[i].querySelectorAll('.e-grptogglebtn')[0] as Element);
                        }
                        if (!isRemove) {
                            headers[i].appendChild(this.parent.createElement(
                                'span', {
                                className: 'e-grptogglebtn e-icons ' +
                                    (this.groupSettings.columns.indexOf(column.field) > -1 ? 'e-toggleungroup e-icon-ungroup'
                                        : 'e-togglegroup e-icon-group'), attrs: { tabindex: '-1', 'aria-label': 'Group button' }
                            }));
                        }
                    }
                }
            }
        }
    }

    private removeColFromGroupDrop(field: string): void {
        if (!isNullOrUndefined(this.getGHeaderCell(field))) {
            let elem: Element = this.getGHeaderCell(field);
            if (this.groupSettings.allowReordering) {
                let parent: Element = parentsUntil(elem, 'e-group-animator');
                remove(parent);
            } else {
                remove(elem);
            }
            this.updateGroupDropArea();
        }
        this.isAppliedUnGroup = false;
    }

    private onPropertyChanged(e: NotifyArgs): void {
        if (e.module !== this.getModuleName()) {
            return;
        }
        for (let prop of Object.keys(e.properties)) {
            switch (prop) {
                case 'columns':
                    let args: Object;
                    if (this.contentRefresh) {
                        if (!this.isAppliedUnGroup) {
                            if (!this.isAppliedGroup) {
                                this.updateGroupDropArea(true);
                                for (let j: number = 0; j < this.parent.sortSettings.columns.length; j++) {
                                    if (this.parent.sortSettings.columns[j].isFromGroup) {
                                        this.parent.sortSettings.columns.splice(j, 1);
                                        j--;
                                    }
                                }
                                for (let i: number = 0; i < this.groupSettings.columns.length; i++) {
                                    this.colName = this.groupSettings.columns[i];
                                    let col: Column = this.parent.getColumnByField(this.colName);
                                    col.visible = this.parent.groupSettings.showGroupedColumn;
                                    this.groupAddSortingQuery(this.colName);
                                    if (i < this.groupSettings.columns.length - 1) {
                                        this.addColToGroupDrop(this.groupSettings.columns[i]);
                                    }
                                }
                            }
                            args = {
                                columnName: this.colName, requestType: e.properties[prop].length ? 'grouping' : 'ungrouping',
                                type: events.actionBegin
                            };
                        } else {
                            args = { columnName: this.colName, requestType: 'ungrouping', type: events.actionBegin };
                        }
                        if (!this.groupSettings.showGroupedColumn) {
                            let columns: string[] = e.oldProperties[prop];
                            for (let i: number = 0; i < columns.length; i++) {
                                if (e.properties[prop].indexOf(columns[i]) === -1) {
                                    this.parent.getColumnByField(columns[i]).visible = true;
                                }
                            }
                        }
                        let requestType: string = 'requestType';
                        if (isBlazor() && this.parent.isServerRendered && this.parent.isCollapseStateEnabled() &&
                            args[requestType] === 'grouping') {
                            this.parent.refreshHeader();
                        }
                        this.parent.notify(events.modelChanged, args);
                    }
                    break;
                case 'showDropArea':
                    this.updateGroupDropArea();
                    this.groupSettings.showDropArea ? this.element.style.display = '' : this.element.style.display = 'none';
                    break;
                case 'showGroupedColumn':
                    this.updateGroupedColumn(this.groupSettings.showGroupedColumn);
                    this.parent.notify(events.modelChanged, { requestType: 'refresh' });
                    break;
                case 'showUngroupButton':
                    this.updateButtonVisibility(this.groupSettings.showUngroupButton, 'e-ungroupbutton');
                    break;
                case 'showToggleButton':
                    this.updateButtonVisibility(this.groupSettings.showToggleButton, 'e-togglegroupbutton ');
                    this.parent.refreshHeader();
                    break;
                case 'enableLazyLoading':
                    (this.parent as Grid).freezeRefresh();
                    break;
            }
        }
    }

    private updateGroupedColumn(isVisible: boolean): void {
        for (let i: number = 0; i < this.groupSettings.columns.length; i++) {
            this.parent.getColumnByField(this.groupSettings.columns[i]).visible = isVisible;
        }
    }

    private updateButtonVisibility(isVisible: boolean, className: string): void {
        let gHeader: HTMLElement[] = [].slice.call(this.element.querySelectorAll('.' + className));
        for (let i: number = 0; i < gHeader.length; i++) {
            gHeader[i].style.display = isVisible ? '' : 'none';
        }
    }


    private enableAfterRender(e: NotifyArgs): void {
        if (e.module === this.getModuleName() && e.enable) {
            this.render();
        }
    }

    /**
     * To destroy the reorder 
     * @return {void}
     * @hidden
     */
    public destroy(): void {
        let gridElement: Element = this.parent.element;
        if (!gridElement || (!gridElement.querySelector('.e-gridheader') && !gridElement.querySelector('.e-gridcontent'))) { return; }
        // tslint:disable-next-line:no-any
        if (!this.parent.isDestroyed && !(<any>this.parent).refreshing) {
            this.clearGrouping();
        }
        this.removeEventListener();
        this.refreshToggleBtn(true);
        remove(this.element);
        //call ejdrag and drop destroy
    }

    /**  
     * Clears all the grouped columns of the Grid.  
     * @return {void} 
     */
    public clearGrouping(): void {
        let cols: string[] = JSON.parse(JSON.stringify(this.groupSettings.columns));
        this.contentRefresh = false;
        for (let i: number = 0, len: number = cols.length; i < len; i++) {
            if (i === (len - 1)) {
                this.contentRefresh = true;
            }
            this.ungroupColumn(cols[i]);
        }
        this.contentRefresh = true;
    }

    /**
     * For internal use only - Get the module name.
     * @private
     */
    protected getModuleName(): string {
        return 'group';
    }

    private refreshSortIcons(e?: { requestType?: Action, columnName: string }): void {
        let gObj: IGrid = this.parent;
        let header: Element;
        let cols: SortDescriptorModel[] = gObj.sortSettings.columns;
        let gCols: string[] = gObj.groupSettings.columns;
        let fieldNames: string[] = this.parent.getColumns().map((c: Column) => c.field);
        this.refreshToggleBtn();
        for (let i: number = 0, len: number = cols.length; i < len; i++) {
            if (fieldNames.indexOf(cols[i].field) === -1) { continue; }
            header = gObj.getColumnHeaderByField(cols[i].field);
            if (!gObj.allowSorting && (this.sortedColumns.indexOf(cols[i].field) > -1 ||
                this.groupSettings.columns.indexOf(cols[i].field) > -1)) {
                classList(header.querySelector('.e-sortfilterdiv'), ['e-ascending', 'e-icon-ascending'], []);
                if (cols.length > 1) {
                    header.querySelector('.e-headercelldiv').appendChild(this.parent.createElement(
                        'span', { className: 'e-sortnumber', innerHTML: (i + 1).toString() }));
                }
            } else if (this.getGHeaderCell(cols[i].field) && this.getGHeaderCell(cols[i].field).querySelectorAll('.e-groupsort').length) {
                if (cols[i].direction === 'Ascending') {
                    classList(
                        this.getGHeaderCell(cols[i].field).querySelector('.e-groupsort'),
                        ['e-ascending', 'e-icon-ascending'], ['e-descending', 'e-icon-descending']);
                } else {
                    classList(
                        this.getGHeaderCell(cols[i].field).querySelector('.e-groupsort'),
                        ['e-descending', 'e-icon-descending'], ['e-ascending', 'e-icon-ascending']);
                }
            }
        }
        for (let i: number = 0, len: number = gCols.length; i < len; i++) {
            if (fieldNames.indexOf(gCols[i]) === -1) { continue; }
            gObj.getColumnHeaderByField(gCols[i]).setAttribute('aria-grouped', 'true');
        }
    }

    private getGHeaderCell(field: string): Element {
        if (this.element && this.element.querySelector('[ej-mappingname="' + field + '"]')) {
            return this.element.querySelector('[ej-mappingname="' + field + '"]').parentElement;
        }
        return null;
    }

    private onGroupAggregates(editedData: Object[]): void {
        let aggregates: Object[] = this.iterateGroupAggregates(editedData);
        let rowData: Object[] = this.groupGenerator.generateRows(aggregates, {});
        let summaryRows: Row<Column>[] = this.parent.getRowsObject().filter((row: Row<Column>) => !row.isDataRow);
        let updateSummaryRows: Object[] = rowData.filter((data: Row<Column>) => !data.isDataRow);
        if (this.parent.isReact) {
            this.parent.destroyTemplate(['groupFooterTemplate', 'groupCaptionTemplate', 'footerTemplate']);
        }
        for (let i: number = 0; i < updateSummaryRows.length; i++) {
            let row: Row<Column> = updateSummaryRows[i] as Row<Column>;
            let cells: Object[] = row.cells.filter((cell: Cell<{}>) => cell.isDataCell);
            let args: Object = { cells: cells, data: row.data, dataUid: summaryRows[i] ? summaryRows[i].uid : '' };
            this.parent.notify(events.refreshAggregateCell, args);
        }
    }

    private iterateGroupAggregates(editedData: Object[]): Object[] {
        let updatedData: Object[] = editedData instanceof Array ? editedData : [];
        let rows: Object[] = this.parent.getRowsObject();
        let initData: Object[] = this.parent.getCurrentViewRecords();
        let deletedCols: Object[] = [];
        let changeds: Object[] = rows.map((row: Row<AggregateColumn> | Row<Column>) => {
            if (row.edit === 'delete') { deletedCols.push(row.data); }
            return row.changes instanceof Object ? row.changes : row.data;
        });
        let field: string = this.parent.getPrimaryKeyFieldNames()[0];
        changeds = updatedData.length === 0 ? changeds : updatedData;
        let mergeData: Object[] = initData.map((item: Object) => {
            let pKeyVal: Object = DataUtil.getObject(field, item);
            let value: Object;
            let hasVal: boolean = changeds.some((cItem: Object) => {
                value = cItem;
                return pKeyVal === DataUtil.getObject(field, cItem);
            });
            return hasVal ? value : item;
        });
        let eData: Object = editedData;
        if (!((<{ type: string }>eData).type && (<{ type: string }>eData).type === 'cancel') && deletedCols.length > 0) {
            for (let i: number = 0; i < deletedCols.length; i++) {
                let index: number = mergeData.indexOf(deletedCols[i]);
                mergeData.splice(index, 1);
            }
        }
        let aggregates: Object[] = [];
        let aggregateRows: AggregateRow | Object[] = this.parent.aggregates;
        for (let j: number = 0; j < aggregateRows.length; j++) {
            let row: AggregateRow = aggregateRows[j] as AggregateRow;
            for (let k: number = 0; k < row.columns.length; k++) {
                let aggr: Object = {};
                let type: string | AggregateType[] = row.columns[k].type.toString();
                aggr = { type: type.toLowerCase(), field: row.columns[k].field };
                aggregates.push(aggr);
            }
        }
        let result: Object[];
        let aggrds: Object[];
        let groupedCols: string[] = this.parent.groupSettings.columns;
        for (let l: number = 0; l < groupedCols.length; l++) {
            aggrds = result ? result : mergeData;
            result = DataUtil.group(aggrds, groupedCols[l], aggregates, null, null);
        }
        return result;
    }

    public updateExpand(args: { uid?: string, isExpand?: boolean }): void {
        let uid: string = args.uid; let isExpand: boolean = args.isExpand;
        let rows: Row<Column>[] = this.parent.getRowsObject();
        for (let i: number = 0; i < rows.length; i++) {
            let row: Row<Column> = rows[i];
            if (row.uid === uid || isNullOrUndefined(uid)) {
                row.isExpand = isExpand;
                for (let j: number = i + 1; j < rows.length; j++) {
                    let childRow: Row<Column> = rows[j];
                    let closestParent: Row<Column>;

                    if (childRow.parentUid !== row.uid) {
                        closestParent = rows.filter((x: Row<Column>) => x.uid === childRow.parentUid)[0];
                    }
                    if (childRow.parentUid === row.uid) {
                        childRow.visible = row.isExpand;
                    } else if (!isNullOrUndefined(closestParent) && childRow.parentUid === closestParent.uid) {
                        if (closestParent.isExpand && closestParent.visible === true) {
                            childRow.visible = true;
                        } else if (closestParent.isExpand && closestParent.visible === false) {
                            childRow.visible = false;
                        }
                    }

                    if (isNullOrUndefined(uid)) {
                        break;
                    }
                }
            }
        }
        this.parent.notify(events.contentReady, { rows: rows, args: { isFrozen: false, rows: rows } });
    }
}

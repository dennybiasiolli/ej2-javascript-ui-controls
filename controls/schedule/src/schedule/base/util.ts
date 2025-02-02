import { createElement, remove, isNullOrUndefined } from '@syncfusion/ej2-base';
import { EventFieldsMapping } from '../base/interface';
import { ResourcesModel } from '../models/resources-model';

/**
 * Schedule common utilities
 */
export const WEEK_LENGTH: number = 7;
export const MS_PER_DAY: number = 86400000;
export const MS_PER_MINUTE: number = 60000;

export function getElementHeightFromClass(container: Element, elementClass: string): number {
    let height: number = 0;
    let el: HTMLElement = createElement('div', { className: elementClass }).cloneNode() as HTMLElement;
    el.style.visibility = 'hidden';
    el.style.position = 'absolute';
    container.appendChild(el);
    height = el.getBoundingClientRect().height;
    remove(el);
    return height;
}

export function getTranslateY(element: HTMLElement | Element): number {
    let style: CSSStyleDeclaration = getComputedStyle(element);
    return (<{ [key: string]: Object } & Window>window).WebKitCSSMatrix ?
        new WebKitCSSMatrix(style.webkitTransform).m42 : 0;
}

export function getWeekFirstDate(date1: Date, firstDayOfWeek: number): Date {
    let date: Date = new Date(date1.getTime());
    firstDayOfWeek = (firstDayOfWeek - date.getDay() + 7 * (-1)) % 7;
    return new Date(date.setDate(date.getDate() + firstDayOfWeek));
}
export function getWeekLastDate(date: Date, firstDayOfWeek: number): Date {
    let weekFirst: Date = getWeekFirstDate(date, firstDayOfWeek);
    let weekLast: Date = new Date(weekFirst.getFullYear(), weekFirst.getMonth(), weekFirst.getDate() + 6);
    return new Date(weekLast.getTime());
}
export function firstDateOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth());
}
export function lastDateOfMonth(dt: Date): Date {
    return new Date(dt.getFullYear(), dt.getMonth() + 1, 0);
}
export function getWeekNumber(dt: Date): number {
    let date: number = new Date(dt.getFullYear(), 0, 1).valueOf();
    let currentDate: number = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).valueOf();
    let dayOfYear: number = ((currentDate - date + MS_PER_DAY) / MS_PER_DAY);
    return Math.ceil(dayOfYear / 7);
}
export function getWeekMiddleDate(weekFirst: Date, weekLast: Date): Date {
    let date: Date = new Date(weekLast.valueOf() - ((weekLast.valueOf() - weekFirst.valueOf()) / 2));
    return date;
}
export function setTime(date: Date, time: number): Date {
    let tzOffsetBefore: number = date.getTimezoneOffset();
    let d: Date = new Date(date.getTime() + time);
    let tzOffsetDiff: number = d.getTimezoneOffset() - tzOffsetBefore;
    date.setTime(d.getTime() + tzOffsetDiff * MS_PER_MINUTE);
    return date;
}
export function resetTime(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
export function getDateInMs(date: Date): number {
    let sysDateOffset: number = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0).getTimezoneOffset();
    let dateOffset: number = date.getTimezoneOffset();
    let tzOffsetDiff: number = dateOffset - sysDateOffset;
    return ((date.getTime() - new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0).getTime())
        - (tzOffsetDiff * 60 * 1000));
}
export function getDateCount(startDate: Date, endDate: Date): number {
    return Math.ceil((endDate.getTime() - startDate.getTime()) / MS_PER_DAY);
}
export function addDays(date: Date, i: number): Date {
    date = new Date('' + date);
    return new Date(date.setDate(date.getDate() + i));
}
export function addMonths(date: Date, i: number): Date {
    date = new Date('' + date);
    let day: number = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() + i);
    date.setDate(Math.min(day, getMaxDays(date)));
    return date;
}
export function addYears(date: Date, i: number): Date {
    date = new Date('' + date);
    let day: number = date.getDate();
    date.setDate(1);
    date.setFullYear(date.getFullYear() + i);
    date.setDate(Math.min(day, getMaxDays(date)));
    return date;
}
export function getStartEndHours(date: Date, startHour: Date, endHour: Date): { [key: string]: Date } {
    let date1: Date = new Date(date.getTime());
    date1.setHours(startHour.getHours());
    date1.setMinutes(startHour.getMinutes());
    date1.setSeconds(startHour.getSeconds());
    let date2: Date = new Date(date.getTime());
    if (endHour.getHours() === 0) {
        date2 = addDays(date2, 1);
    } else {
        date2.setHours(endHour.getHours());
        date2.setMinutes(endHour.getMinutes());
        date2.setSeconds(endHour.getSeconds());
    }
    return { startHour: date1, endHour: date2 };
}
export function getMaxDays(d: Date): number {
    let date: Date = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return date.getDate();
}
export function getDaysCount(startDate: number, endDate: number): number {
    let strTime: Date = resetTime(new Date(startDate));
    let endTime: Date = resetTime(new Date(endDate));
    return Math.round((endTime.getTime() - strTime.getTime()) / MS_PER_DAY);
}
export function getDateFromString(date: string): Date {
    return date.indexOf('Date') !== -1 ? new Date(parseInt(date.match(/\d+/g).toString(), 10)) :
        date.indexOf('T') !== -1 ? new Date(date) : new Date(date.replace(/-/g, '/'));
}

/** @hidden */
let scrollWidth: number = null;

/** @hidden */
export function getScrollBarWidth(): number {
    if (scrollWidth !== null) { return scrollWidth; }
    let divNode: HTMLElement = createElement('div');
    let value: number = 0;
    divNode.style.cssText = 'width:100px;height: 100px;overflow: scroll;position: absolute;top: -9999px;';
    document.body.appendChild(divNode);
    let ratio: number = (devicePixelRatio) ? (devicePixelRatio.toFixed(2) === '1.10' || devicePixelRatio <= 1) ?
        Math.ceil(devicePixelRatio % 1) : Math.floor(devicePixelRatio % 1) : 0;
    value = (divNode.offsetWidth - divNode.clientWidth - ratio) | 0;
    document.body.removeChild(divNode);
    return scrollWidth = value;
}

export function findIndexInData(
    data: { [key: string]: Object }[], property: string, value: string, event?: { [key: string]: Object }, resourceCollection?: Object[])
    : number {
    for (let i: number = 0, length: number = data.length; i < length; i++) {
        if (data[i][property] === value) {
            if (event) {
                let field: string = (resourceCollection.slice(-2)[0] as ResourcesModel).field;
                let res: string[] = (event[field] instanceof Array ? event[field] : [event[field]]) as string[];
                let resData: string = res.join(',');
                // tslint:disable-next-line:no-any
                if (resData.includes(data[i][(resourceCollection.slice(-1)[0] as any).groupIDField] as string)) {
                    return i;
                }
            } else {
                return i;
            }
        }
    }
    return -1;
}

export function getOuterHeight(element: HTMLElement): number {
    let style: CSSStyleDeclaration = getComputedStyle(element);
    return element.offsetHeight + (parseInt(style.marginTop, 10) || 0) + (parseInt(style.marginBottom, 10) || 0);
}

export function removeChildren(element: HTMLElement | Element): void {
    let elementChildren: HTMLElement[] | Element[] = [].slice.call(element.children);
    for (let elementChild of elementChildren) {
        if (!elementChild.classList.contains('blazor-template')) {
            element.removeChild(elementChild);
        }
    }
}

export function isDaylightSavingTime(date: Date): boolean {
    let jan: Date = new Date(date.getFullYear(), 0, 1);
    let jul: Date = new Date(date.getFullYear(), 6, 1);
    return date.getTimezoneOffset() < Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
}

export function addLocalOffset(date: Date): Date {
    return date;
}

export function addLocalOffsetToEvent(event: { [key: string]: Object }, eventFields: EventFieldsMapping): { [key: string]: Object } {
    return event;
}

export function isIPadDevice(): boolean {
    let deviceCheck: string = window.navigator.userAgent.toLowerCase();
    return deviceCheck.indexOf('ipad') > -1;
}

export function capitalizeFirstWord(inputString: string, type: string): string {
    switch (type) {
        case 'multiple':
            inputString = inputString.split(' ').map((e: string) => e.charAt(0).toLocaleUpperCase() + e.substring(1)).join(' ');
            break;
        case 'single':
            if (inputString[0] >= '0' && inputString[0] <= '9') {
                let array: RegExpMatchArray = inputString.match(/[a-zA-Z]/);
                inputString = isNullOrUndefined(array) ? inputString :
                    inputString.slice(0, array.index) + inputString[array.index].toLocaleUpperCase() + inputString.slice(array.index + 1);
            }
            inputString = inputString[0].toLocaleUpperCase() + inputString.slice(1);
            break;
    }
    return inputString;
}
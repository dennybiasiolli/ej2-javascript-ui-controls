/**
 * Selection commands spec document
 */
import { detach, Browser } from '@syncfusion/ej2-base';
import { NodeSelection } from '../../../src/selection/selection';
import { SelectionCommands } from '../../../src/editor-manager/plugin/selection-commands';
import { renderRTE, destroy } from '../../rich-text-editor/render.spec';

describe('Selection commands', () => {
    //HTML value
    let innervalue: string = '<div id="div1"><p id="paragraph1"><b>Description:</b></p>' +
        '<p id="paragraph2">The Rich Text Editor (RTE) control is an easy to render in' +
        'client side. Customer easy to edit the contents and get the HTML content for' +
        'the displayed content. A rich text editor control provides users with a toolbar' +
        'that helps them to apply rich text formats to the text entered in the text' +
        'area. </p>' +
        '<p id="paragraph3">Functional' +
        'Specifications/Requirements:</p>' +
        '<ol>'+
        '<li><p id="paragraph4">Provide the tool bar support, it’s also customizable.</p></li>'+
        '<li><p id="paragraph5">Options to get the HTML elements with styles.</p></li>'+
        '<li><p id="paragraph6">Support to insert image from a defined path.</p></li>'+
        '<li><p id="paragraph7">Footer elements and styles(tag / Element information , Action button (Upload, Cancel))</p></li>'+
        '<li><p id="paragraph8">Re-size the editor support.</p></li>'+
        '<li><p id="paragraph9">Provide efficient public methods and client side events.</p></li>'+
        '<li><p id="paragraph10">Keyboard navigation support.</p></li>'+
        '</ol>'+
        '<p id="paragraph11">The Rich Text Editor (RTE) control is an easy to render in' +
        'client side.</p>'+
        '<span id="boldparent"><span id="bold1" style="font-weight:bold;">the Rich Text Editor (RTE) control is an easy to render in' +
        'client side.</span></span>'+
        '<span id="italicparent"><span id="italic1" style="font-style:italic;">the Rich Text Editor (RTE) control is an easy to render in' +
        'client side.</span></span>'+
        '<span id="underlineparent"><u id="underline1">the Rich Text Editor (RTE) control is an easy to render in' +
        'client side.</u></span>'+
        '<span id="strikeparent"><del id="strike1">the Rich Text Editor (RTE) control is an easy to render in' +
        'client side.</del></span>'+
        '<span id="cursor1">the   Rich Text Editor (RTE) control is an easy to render in' +
        'client side.</span>'+
        '<span id="cursor2">the   Rich Text Editor (RTE) control is an easy to render in' +
        'client side.</span>'+
        '<strong id="cursor3">the   Rich Text Editor (RTE) control is an easy to render in' +
        'client side.</strong>'+
        '<p id="cursor4"><strong id="cursor5">the   Rich Text Editor (RTE) control is an easy to render in' +
        'client side.</strong></p>'+
        '<p id="cursor6"><strong><em><u id="cursor7">the   Rich Text Editor (RTE) control is an easy to render in' +
        'client side.</u></em></strong></p>'+
        '<p id="cursor8"><strong><em><u id="cursor9">the                     Rich Text Editor (RTE) control is an easy to render in' +
        'client side.</u></em></strong>'+
        '<strong id="cursor10">the   Rich Text Editor (RTE) control is an easy to render in' +
        'client side.</strong>'+
        '</p>'+
        '<p id="paragraph01"><b id="bold01">Description:</b></p>' +
        '<p id="paragraph02">The Rich Text Editor (RTE) control is an easy to render in' +
        'client side. Customer easy to edit the contents and get the HTML content for' +
        'the displayed content. A rich text editor control provides users with a toolbar' +
        'that helps them to apply rich text formats to the text entered in the text' +
        'area. </p>' +
        '<p id="paragraph03"><br/></p>' +
        '<span id="format1">the   Rich Text Editor (RTE) control is an easy to render in' +
        'client side.</span>'+
        '<span id="format2">the   Rich Text Editor (RTE) control is an easy to render in' +
        'client <span id="format3">side</span>.</span>'+
        '<span id="format4">the   Rich Text Editor (RTE) control is an easy to render in' +
        'client side.</span>'+
        '<span><strong id="format5">the   <em><u>Rich Text Editor (RTE)</u></em></strong> control is an easy to render in' +
        'client side.</span>'+
        '<span id="format6">the Rich Text Editor (RTE) <span style="color:rgb(102, 102, 0);">control</span> is an easy to render in' +
        'client side.</span>'+
        '<ol>'+
        '<li><p id="paragraph20">paragraph20</p></li>'+
        '<li><p id="paragraph21">paragraph21</p></li>'+
        '<li><p id="paragraph22">paragraph22</p></li>'+
        '<li><p id="paragraph23">paragraph23</p></li>'+
        '<li><p id="paragraph24">paragraph24</p></li>'+
        '<li><p id="paragraph25">paragraph25</p></li>'+
        '<li><p id="paragraph26">paragraph26</p></li>'+
        '</ol>'+
        '<ol>'+
        '<li><p id="paragraph27">paragraph27&nbsp;</p></li>'+
        '<li><p id="paragraph28">paragraph28</p></li>'+
        '</ol>'+
        '<p id="paragraph29"><strong>paragraph29</strong></p>'+
        '</div>';

    let domSelection: NodeSelection = new NodeSelection();
    //DIV Element
    let divElement: HTMLDivElement = document.createElement('div');
    divElement.id = 'divElement';
    divElement.contentEditable = 'true';
    divElement.innerHTML = innervalue;
    let ptag: Node = null;
    let fontTag: Node = null;
    let parentDiv: HTMLDivElement;

    beforeAll(() => {
        document.body.appendChild(divElement);
        parentDiv = document.getElementById('div1') as HTMLDivElement;
    });
    afterAll(() => {
        detach(divElement);
    });
    /**
     * Text Node Direct Parent
     */
    it('Apply italic tag for end nodes', () => {
        let node1: Node = document.getElementById('bold01');
        let text1: Text = node1.childNodes[0] as Text;
        let node2: HTMLElement = document.getElementById('paragraph02');
        let text2: Text = node2.childNodes[0] as Text;
        domSelection.setSelectionText(document, text1, text2, 12, 16);
        SelectionCommands.applyFormat(document, 'italic', parentDiv);
        expect(node1.childNodes.length).toEqual(2);
    });
    it('Apply italic tag for None nodes', () => {
        let node1: Node = document.getElementById('paragraph03');
        domSelection.setSelectionText(document, node1, node1, 0, 0);
        SelectionCommands.applyFormat(document, 'italic', parentDiv);
        expect(node1.childNodes.length).toEqual(2);
    });
    it('Apply Bold tag for multiple nodes', () => {
        let node1: Node = document.getElementById('paragraph4');
        let text1: Text = node1.childNodes[0] as Text;
        let node2: HTMLElement = document.getElementById('paragraph9');
        let text2: Text = node2.childNodes[0] as Text;
        ptag = node1;
        domSelection.setSelectionText(document, text1, text2, 0, 16);
        SelectionCommands.applyFormat(document, 'bold', parentDiv);
        expect(node1.childNodes[0].nodeName.toLowerCase()).toEqual('strong');
    });
    it('Apply subscript tag for multiple nodes', () => {
        SelectionCommands.applyFormat(document, 'subscript', parentDiv);
        expect(ptag.childNodes[0].childNodes[0].nodeName.toLowerCase()).toEqual('sub');
    });
    it('Apply underline tag for multiple nodes', () => {
        SelectionCommands.applyFormat(document, 'underline', parentDiv);
        expect(ptag.childNodes[0].childNodes[0].childNodes[0].nodeName.toLowerCase()).toEqual('span');
        expect((ptag.childNodes[0].childNodes[0].childNodes[0] as HTMLElement)
        .style.textDecoration).toEqual('underline');
    });
    it('Apply strikethrough tag for multiple nodes', () => {
        SelectionCommands.applyFormat(document, 'strikethrough', parentDiv);
        expect(ptag.childNodes[0].childNodes[0].childNodes[0].childNodes[0].nodeName.toLowerCase()).toEqual('span');
        expect((ptag.childNodes[0].childNodes[0].childNodes[0].childNodes[0] as HTMLElement)
        .style.textDecoration).toEqual('line-through');
    });
    it('Apply superscript tag for multiple nodes', () => {
        SelectionCommands.applyFormat(document, 'superscript', parentDiv);
        expect(ptag.childNodes[0].childNodes[0].childNodes[0].childNodes[0].nodeName.toLowerCase()).toEqual('sup');
    });
    it('Apply Italic tag for multiple nodes', () => {
        SelectionCommands.applyFormat(document, 'italic', parentDiv);
        expect(ptag.childNodes[0].childNodes[0].childNodes[0]
            .childNodes[0].childNodes[0].nodeName.toLowerCase()).toEqual('em');
    });
    it('Revert Italic tag for multiple nodes', () => {
        SelectionCommands.applyFormat(document,'italic', parentDiv);
        expect(ptag.childNodes[0].childNodes[0].childNodes[0]
            .childNodes[0].childNodes[0].nodeName).toEqual('#text');
    });
    it('Revert superscript tag for multiple nodes', () => {
        SelectionCommands.applyFormat(document,'superscript', parentDiv);
        expect(ptag.childNodes[0].childNodes[0].childNodes[0].childNodes[0].nodeName).toEqual('#text');
    });
    it('Revert strikethrough tag for multiple nodes', () => {
        SelectionCommands.applyFormat(document,'strikethrough', parentDiv);
        expect(ptag.childNodes[0].childNodes[0].childNodes[0].nodeName).toEqual('#text');
    });
    it('Revert underline tag for multiple nodes', () => {
        SelectionCommands.applyFormat(document,'underline', parentDiv);
        expect(ptag.childNodes[0].childNodes[0].nodeName).toEqual('#text');
    });
    it('Revert Bold tag for multiple nodes', () => {
        SelectionCommands.applyFormat(document,'bold', parentDiv);
        expect(ptag.childNodes[0].nodeName).toEqual('#text');
    });
    it('Apply Bold tag for cursor position', () => {
        let node1: Node = document.getElementById('paragraph4');
        let text1: Text = node1.childNodes[0] as Text;
        ptag = node1;
        domSelection.setSelectionText(document, text1, text1, 1, 1);
        SelectionCommands.applyFormat(document, 'bold', parentDiv);
        expect(node1.childNodes[0].nodeName.toLowerCase()).toEqual('strong');
    });
    it('Apply subscript tag for cursor position', () => {
        SelectionCommands.applyFormat(document, 'subscript', parentDiv);
        expect(ptag.childNodes[0].childNodes[0].nodeName.toLowerCase()).toEqual('sub');
    });
    it('Apply underline tag for cursor position', () => {
        SelectionCommands.applyFormat(document, 'underline', parentDiv);
        expect(ptag.childNodes[0].childNodes[0].childNodes[0].nodeName.toLowerCase()).toEqual('span');
        expect((ptag.childNodes[0].childNodes[0].childNodes[0] as HTMLElement).style.textDecoration).toEqual('underline');
    });
    it('Apply strikethrough tag for cursor position', () => {
        SelectionCommands.applyFormat(document, 'strikethrough', parentDiv);
        expect(ptag.childNodes[0].childNodes[0].childNodes[0].childNodes[0].nodeName.toLowerCase()).toEqual('span');
    });
    it('Apply superscript tag for cursor position', () => {
        SelectionCommands.applyFormat(document, 'superscript', parentDiv);
        expect(ptag.childNodes[0].childNodes[0].childNodes[0].childNodes[0].nodeName.toLowerCase()).toEqual('sup');
    });
    it('Apply Italic tag for cursor position', () => {
        SelectionCommands.applyFormat(document, 'italic', parentDiv);
        expect(ptag.childNodes[0].childNodes[0].childNodes[0]
            .childNodes[0].childNodes[0].nodeName.toLowerCase()).toEqual('em');
    });
    it('Revert Italic tag for cursor position', () => {
        SelectionCommands.applyFormat(document,'italic', parentDiv);
        expect(ptag.childNodes[0].childNodes[0].childNodes[0]
            .childNodes[0].childNodes[0].nodeName).toEqual('#text');
    });
    it('Revert superscript tag for cursor position', () => {
        SelectionCommands.applyFormat(document,'superscript', parentDiv);
        expect(ptag.childNodes[0].childNodes[0].childNodes[0].childNodes[0].nodeName).toEqual('#text');
    });
    it('Revert strikethrough tag for cursor position', () => {
        SelectionCommands.applyFormat(document,'strikethrough', parentDiv);
        expect(ptag.childNodes[0].childNodes[0].childNodes[0].nodeName).toEqual('#text');
    });
    it('Revert underline tag for cursor position', () => {
        SelectionCommands.applyFormat(document,'underline', parentDiv);
        expect(ptag.childNodes[0].childNodes[0].nodeName).toEqual('#text');
    });
    it('Revert Bold tag for cursor position', () => {
        SelectionCommands.applyFormat(document,'bold', parentDiv);
        expect(ptag.childNodes[0].nodeName).toEqual('#text');
    });
    it('Apply Bold tag for text node', () => {
        let node1: Node = document.getElementById('paragraph4');
        let text1: Text = node1.childNodes[0] as Text;
        ptag = node1;
        domSelection.setSelectionText(document, text1, text1, 0, 7);
        SelectionCommands.applyFormat(document, 'bold', parentDiv);
        expect(node1.childNodes[0].nodeName.toLowerCase()).toEqual('strong');
    });
    it('Apply subscript tag for text node', () => {
        SelectionCommands.applyFormat(document, 'subscript', parentDiv);
        expect(ptag.childNodes[0].childNodes[0].nodeName.toLowerCase()).toEqual('sub');
    });
    it('Apply underline tag for text node', () => {
        SelectionCommands.applyFormat(document, 'underline', parentDiv);
        expect(ptag.childNodes[0].childNodes[0].childNodes[0].nodeName.toLowerCase()).toEqual('span');
        expect((ptag.childNodes[0].childNodes[0].childNodes[0] as HTMLElement)
        .style.textDecoration).toEqual('underline');
    });
    it('Apply strikethrough tag for text node', () => {
        SelectionCommands.applyFormat(document, 'strikethrough', parentDiv);
        expect(ptag.childNodes[0].childNodes[0].childNodes[0].childNodes[0].nodeName.toLowerCase()).toEqual('span');
        expect((ptag.childNodes[0].childNodes[0].childNodes[0].childNodes[0] as HTMLElement)
        .style.textDecoration).toEqual('line-through');
    });
    it('Apply superscript tag for text node', () => {
        SelectionCommands.applyFormat(document, 'superscript', parentDiv);
        expect(ptag.childNodes[0].childNodes[0].childNodes[0].childNodes[0].nodeName.toLowerCase()).toEqual('sup');
    });
    it('Apply Italic tag for text node', () => {
        SelectionCommands.applyFormat(document, 'italic', parentDiv);
        expect(ptag.childNodes[0].childNodes[0]
            .childNodes[0].childNodes[0].childNodes[0].nodeName.toLowerCase()).toEqual('em');
    });
    it('Revert Italic tag for text node', () => {
        SelectionCommands.applyFormat(document,'italic', parentDiv);
        expect(ptag.childNodes[0].childNodes[0]
            .childNodes[0].childNodes[0].childNodes[0].nodeName).toEqual('#text');
    });
    it('Revert superscript tag for text node', () => {
        SelectionCommands.applyFormat(document,'superscript', parentDiv);
        expect(ptag.childNodes[0].childNodes[0].childNodes[0].childNodes[0].nodeName).toEqual('#text');
    });
    it('Revert strikethrough tag for text node', () => {
        SelectionCommands.applyFormat(document,'strikethrough', parentDiv);
        expect(ptag.childNodes[0].childNodes[0].childNodes[0].nodeName).toEqual('#text');
    });
    it('Revert underline tag for text node', () => {
        SelectionCommands.applyFormat(document,'underline', parentDiv);
        expect(ptag.childNodes[0].childNodes[0].nodeName).toEqual('#text');
    });
    it('Revert Bold tag for text node', () => {
        SelectionCommands.applyFormat(document,'bold', parentDiv);
        expect(ptag.childNodes[0].nodeName).toEqual('#text');
    });

    // Apply font color
    it('Apply fontcolor tag for text node', () => {
        let node1: Node = document.getElementById('paragraph11');
        let text1: Text = node1.childNodes[0] as Text;
        ptag = node1;
        domSelection.setSelectionText(document, text1, text1, 0, 26);
        SelectionCommands.applyFormat(document, 'fontcolor', parentDiv, 'rgb(102, 102, 0)');
        expect((node1.childNodes[0] as HTMLElement).style.color).toEqual('rgb(102, 102, 0)');
        expect((node1.childNodes[0] as HTMLElement).nodeName.toLowerCase()).toEqual('span');
    });
    it('Apply fontname tag for text node', () => {
        SelectionCommands.applyFormat(document, 'fontname', parentDiv, 'Arial');
        expect((ptag.childNodes[0].childNodes[0] as HTMLElement).style.fontFamily).toEqual('Arial');
        expect((ptag.childNodes[0].childNodes[0] as HTMLElement).nodeName.toLowerCase()).toEqual('span');
    });
    it('Apply fontsize tag for text node', () => {
        SelectionCommands.applyFormat(document, 'fontsize', parentDiv, '20px');
        expect((ptag.childNodes[0].childNodes[0].childNodes[0] as HTMLElement).style.fontSize).toEqual('20px');
        expect((ptag.childNodes[0].childNodes[0].childNodes[0] as HTMLElement).nodeName.toLowerCase()).toEqual('span');
    });
    it('Apply backgroundcolor tag for text node', () => {
        SelectionCommands.applyFormat(document, 'backgroundcolor', parentDiv,  'rgb(246, 198, 206)');
        expect(
        (ptag.childNodes[0].childNodes[0].childNodes[0].childNodes[0] as HTMLElement).style.backgroundColor).toEqual('rgb(246, 198, 206)');
        expect(
            (ptag.childNodes[0].childNodes[0].childNodes[0].childNodes[0] as HTMLElement).nodeName.toLowerCase()).toEqual('span');
    });
    it('Apply uppercase tag for text node', () => {
        SelectionCommands.applyFormat(document, 'uppercase', parentDiv);
        expect(ptag.childNodes[0].childNodes[0].childNodes[0]
        .childNodes[0].textContent).toEqual('THE RICH TEXT EDITOR (RTE)');
    });
    it('Re - Apply lowercase tag for text node', () => {
        SelectionCommands.applyFormat(document, 'lowercase', parentDiv);
        fontTag = ptag.childNodes[0].childNodes[0].childNodes[0].childNodes[0];
        expect(ptag.childNodes[0].childNodes[0].childNodes[0]
            .childNodes[0].textContent).toEqual('the rich text editor (rte)');
    });
    it('Re - Apply backgroundcolor tag for text node', () => {
        SelectionCommands.applyFormat(document, 'backgroundcolor', parentDiv, 'rgb(246, 198, 2)');
        expect(
        (ptag.childNodes[0].childNodes[0].childNodes[0].childNodes[0] as HTMLElement).style.backgroundColor).toEqual('rgb(246, 198, 2)');
        expect(
            (ptag.childNodes[0].childNodes[0].childNodes[0].childNodes[0] as HTMLElement).nodeName.toLowerCase()).toEqual('span');
    });
    it('Re - Apply fontsize tag for text node', () => {
        SelectionCommands.applyFormat(document, 'fontsize', parentDiv, '40px');
        expect((ptag.childNodes[0].childNodes[0].childNodes[0] as HTMLElement).style.fontSize).toEqual('40px');
        expect((ptag.childNodes[0].childNodes[0].childNodes[0] as HTMLElement).nodeName.toLowerCase()).toEqual('span');
    });
    it('Re - Apply fontname tag for text node', () => {
        SelectionCommands.applyFormat(document, 'fontname', parentDiv, 'monospace');
        expect((ptag.childNodes[0].childNodes[0] as HTMLElement).style.fontFamily).toEqual('monospace');
        expect((ptag.childNodes[0].childNodes[0] as HTMLElement).nodeName.toLowerCase()).toEqual('span');
    });
    it('Re - Apply fontcolor tag for text node', () => {
        SelectionCommands.applyFormat(document, 'fontcolor', parentDiv, 'rgb(226, 10, 10)');
        expect((ptag.childNodes[0] as HTMLElement).style.color).toEqual('rgb(226, 10, 10)');
        expect((ptag.childNodes[0] as HTMLElement).nodeName.toLowerCase()).toEqual('span');
    });
    it('Apply fontcolor tag for already applied specific text node', () => {
        fontTag = ptag.childNodes[0].childNodes[0].childNodes[0].childNodes[0];
        let text1: Text = fontTag.childNodes[0] as Text;
        domSelection.setSelectionText(document, text1, text1, 3, 10);
        SelectionCommands.applyFormat(document, 'fontcolor', parentDiv, 'rgb(102, 102, 0)');
        expect((ptag.childNodes[1] as HTMLElement).style.color).toEqual('rgb(102, 102, 0)');
        expect((ptag.childNodes[1] as HTMLElement).nodeName.toLowerCase()).toEqual('span');
    });
    it('Apply fontname tag for already applied specific text node', () => {
        SelectionCommands.applyFormat(document, 'fontname', parentDiv, 'Arial');
        expect((ptag.childNodes[1].childNodes[0] as HTMLElement).style.fontFamily).toEqual('Arial');
        expect((ptag.childNodes[1].childNodes[0] as HTMLElement).nodeName.toLowerCase()).toEqual('span');
    });
    it('Apply fontsize tag for already applied specific text node', () => {
        SelectionCommands.applyFormat(document, 'fontsize', parentDiv, '20px');
        expect((ptag.childNodes[1].childNodes[0].childNodes[0] as HTMLElement).style.fontSize).toEqual('20px');
        expect((ptag.childNodes[1].childNodes[0].childNodes[0] as HTMLElement).nodeName.toLowerCase()).toEqual('span');
    });
    it('Apply backgroundcolor tag for already applied specific text node', () => {
        SelectionCommands.applyFormat(document, 'backgroundcolor', parentDiv, 'rgb(246, 198, 206)');
        expect(
        (ptag.childNodes[1].childNodes[0].childNodes[0].childNodes[0] as HTMLElement).style.backgroundColor)
        .toEqual('rgb(246, 198, 206)');
        expect(
            (ptag.childNodes[1].childNodes[0].childNodes[0].childNodes[0] as HTMLElement).nodeName.toLowerCase())
            .toEqual('span');
    });
    it('Apply uppercase tag for already applied specific text node', () => {
        SelectionCommands.applyFormat(document, 'uppercase', parentDiv);
        expect(ptag.childNodes[1].childNodes[0].childNodes[0].childNodes[0].childNodes[0].textContent)
        .toEqual(' RICH T');
    });

    // spec coverage 
    it('Apply Bold tag for span style node', () => {
        let node1: Node = document.getElementById('bold1');
        let text1: Text = node1.childNodes[0] as Text;
        domSelection.setSelectionText(document, text1, text1, 0, 3);
        SelectionCommands.applyFormat(document, 'bold', parentDiv);
        expect(document.getElementById('boldparent').childNodes[0].textContent).toEqual('the');
    });
    it('Apply Italic tag for span style node', () => {
        let node1: Node = document.getElementById('italic1');
        let text1: Text = node1.childNodes[0] as Text;
        domSelection.setSelectionText(document, text1, text1, 0, 3);
        SelectionCommands.applyFormat(document, 'italic', parentDiv);
        expect(document.getElementById('italicparent').childNodes[0].textContent).toEqual('the');
    });
    it('Apply Underline tag for span style node', () => {
        let node1: Node = document.getElementById('underline1');
        let text1: Text = node1.childNodes[0] as Text;
        domSelection.setSelectionText(document, text1, text1, 0, 3);
        SelectionCommands.applyFormat(document, 'underline', parentDiv);
        expect(document.getElementById('italicparent').childNodes[0].textContent).toEqual('the');
    });
    it('Apply Strike tag for span style node', () => {
        let node1: Node = document.getElementById('strike1');
        let text1: Text = node1.childNodes[0] as Text;
        domSelection.setSelectionText(document, text1, text1, 0, 3);
        SelectionCommands.applyFormat(document, 'strikethrough', parentDiv);
        expect(document.getElementById('italicparent').childNodes[0].textContent).toEqual('the');
    });
    it('Apply Bold tag for cursor position 1', () => {
        let node1: Node = document.getElementById('cursor1');
        let text1: Text = node1.childNodes[0] as Text;
        domSelection.setSelectionText(document, text1, text1, 5, 5);
        SelectionCommands.applyFormat(document, 'bold', parentDiv);
        expect(node1.childNodes[1].nodeName.toLowerCase()).toEqual('strong');
    });
    it('Apply Bold tag for cursor position 2', () => {
        let node1: Node = document.getElementById('cursor5');
        let text1: Text = node1.childNodes[0] as Text;
        domSelection.setSelectionText(document, text1, text1, 4, 4);
        SelectionCommands.applyFormat(document, 'bold', parentDiv);
        expect(document.getElementById('cursor4').childNodes[1].nodeName.toLowerCase()).toEqual('#text');
    });
    it('Apply Bold tag for cursor position 3', () => {
        let node1: Node = document.getElementById('cursor7');
        let text1: Text = node1.childNodes[0] as Text;
        domSelection.setSelectionText(document, text1, text1, 4, 4);
        SelectionCommands.applyFormat(document, 'bold', parentDiv);
        expect(document.getElementById('cursor6').childNodes.length).toEqual(3);
    });
    it('Apply uppercase tag for cursor position 1', () => {
        let node1: Node = document.getElementById('cursor7');
        let text1: Text = node1.childNodes[0] as Text;
        domSelection.setSelectionText(document, text1, text1, 4, 4);
        SelectionCommands.applyFormat(document, 'uppercase', parentDiv);
        expect(document.getElementById('cursor6').childNodes.length).toEqual(3);
    });
    it('Apply strikethrough tag for cursor position 1', () => {
        let node1: Node = document.getElementById('cursor9');
        let text1: Text = node1.childNodes[0] as Text;
        domSelection.setSelectionText(document, text1, text1, 3, 3);
        SelectionCommands.applyFormat(document, 'strikethrough', parentDiv);
        expect(document.getElementById('cursor8').childNodes.length).toEqual(2);
    });
    // Branch coverage
    it('Unknown tag for cursor position', () => {
        let node1: Node = document.getElementById('cursor1');
        let text1: Text = node1.childNodes[0] as Text;
        domSelection.setSelectionText(document, text1, text1, 0, 3);
        SelectionCommands.applyFormat(document, 'scripts', parentDiv);
        expect(node1.nodeName.toLowerCase()).toEqual('span');
    });
    it('un formatted tag for selection', () => {
        let node1: Node = document.getElementById('cursor2');
        let node2: Node = document.getElementById('cursor3');
        let text1: Text = node1.childNodes[0] as Text;
        let text2: Text = node2.childNodes[0] as Text;
        domSelection.setSelectionText(document, text1, text2, 0, 3);
        SelectionCommands.applyFormat(document, 'bold', parentDiv);
        expect(node1.childNodes[0].nodeName.toLowerCase()).toEqual('strong');
    });
    it('Edge browser formatted issue', () => {
        let node1: Node = document.getElementById('format1');
        let text1: Text = node1.childNodes[0] as Text;
        domSelection.setSelectionText(document, text1, text1, 0, text1.nodeValue.length);
        SelectionCommands.applyFormat(document, 'bold', parentDiv);
        expect(node1.childNodes[0].nodeName.toLowerCase()).toEqual('strong');
        SelectionCommands.applyFormat(document, 'bold', parentDiv);
        expect(node1.childNodes[0].nodeName.toLowerCase()).toEqual('#text');
    });
    it('Cursor pointer multiple style with empty node applied issue', () => {
        let regEx: RegExp = new RegExp(String.fromCharCode(8203), 'g');
        let node1: Node = document.getElementById('format4');
        let text1: Text = node1.childNodes[0] as Text;
        domSelection.setSelectionText(document, text1, text1, 0, 0);
        SelectionCommands.applyFormat(document, 'bold', parentDiv);
        expect((node1 as HTMLElement).children[0].textContent.match(regEx)).not.toBe(null);
        SelectionCommands.applyFormat(document, 'italic', parentDiv);
        expect((node1 as HTMLElement).children[0].children[0].textContent.match(regEx)).not.toBe(null);
        SelectionCommands.applyFormat(document, 'underline', parentDiv);
        expect((node1 as HTMLElement).children[0].children[0].textContent.match(regEx)).not.toBe(null);
        SelectionCommands.applyFormat(document, 'bold', parentDiv);
        expect(node1.childNodes[2].nodeName.toLowerCase()).toEqual('em');
        expect(node1.childNodes[2].childNodes[1].nodeName.toLowerCase()).toEqual('span');
    });
    it('Cursor pointer multiple style with textnode applied issue', () => {
        let node1: Node = document.getElementById('format5').querySelector('u');
        let text1: Text = node1.childNodes[0] as Text;
        domSelection.setSelectionText(document, text1, text1, text1.nodeValue.length, text1.nodeValue.length);
        SelectionCommands.applyFormat(document, 'bold', parentDiv);
        expect(document.getElementById('format5').nextSibling.nodeName.toLowerCase()).toEqual('em');
        expect(document.getElementById('format5').nextSibling.childNodes[0].nodeName.toLowerCase()).toEqual('u');
    });
    it('transparent background color not apllied issue', () => {
        let node1: Node = document.getElementById('format6');
        domSelection.setSelectionText(document, node1, node1, 0, node1.childNodes.length);
        SelectionCommands.applyFormat(document, 'fontcolor', parentDiv, '');
        expect((document.getElementById('format6').childNodes[1] as HTMLElement).style.color).toEqual('');
    });
    it('Apply fontsize tag for list elements', () => {
        let node1: Node = document.getElementById('paragraph20');
        let listNode1: Text = node1.childNodes[0] as Text;
        let node2: Node = document.getElementById('paragraph26');
        let listNode2: Text = node2.childNodes[0] as Text;
        domSelection.setSelectionText(document, listNode1, listNode2, 0, 11);
        SelectionCommands.applyFormat(document, 'fontsize', parentDiv, '36px');
        expect(document.getElementById('paragraph20').parentElement.style.fontSize).toEqual('36px');
        expect(document.getElementById('paragraph21').parentElement.style.fontSize).toEqual('36px');
        expect(document.getElementById('paragraph22').parentElement.style.fontSize).toEqual('36px');
        expect(document.getElementById('paragraph23').parentElement.style.fontSize).toEqual('36px');
        expect(document.getElementById('paragraph24').parentElement.style.fontSize).toEqual('36px');
        expect(document.getElementById('paragraph25').parentElement.style.fontSize).toEqual('36px');
        expect(document.getElementById('paragraph26').parentElement.style.fontSize).toEqual('36px');
    });

    it('Apply fontsize tag for list elements', () => {
        let node1: Node = document.getElementById('paragraph20');
        //The childnode changed because the span element is added to list element with styles
        let listNode1: Text = node1.childNodes[0].childNodes[0] as Text;
        let node2: Node = document.getElementById('paragraph26');
        let listNode2: Text = node2.childNodes[0].childNodes[0] as Text;
        domSelection.setSelectionText(document, listNode1, listNode2, 5, 5);
        SelectionCommands.applyFormat(document, 'fontsize', parentDiv, '10px');
        expect(document.getElementById('paragraph20').parentElement.style.fontSize).not.toEqual('10px');
        expect(((document.getElementById('paragraph20').firstElementChild as HTMLElement).tagName.toLowerCase()) === 'span').toBe(true);
        expect((document.getElementById('paragraph20').childNodes[1] as HTMLElement).style.fontSize).toEqual('10px');
        expect(document.getElementById('paragraph21').parentElement.style.fontSize).toEqual('10px');
        expect(document.getElementById('paragraph22').parentElement.style.fontSize).toEqual('10px');
        expect(document.getElementById('paragraph23').parentElement.style.fontSize).toEqual('10px');
        expect(document.getElementById('paragraph24').parentElement.style.fontSize).toEqual('10px');
        expect(document.getElementById('paragraph25').parentElement.style.fontSize).toEqual('10px');
        expect(document.getElementById('paragraph26').parentElement.style.fontSize).not.toEqual('10px');
        expect((document.getElementById('paragraph26').firstElementChild.tagName.toLowerCase()) === 'span').toBe(true);
        expect((document.getElementById('paragraph26').firstElementChild as HTMLElement).style.fontSize).toEqual('10px');
    });
    it('Apply fontsize tag for list elements with space', () => {
        let node1: Node = document.getElementById('paragraph27');
        let listNode1: Text = node1.childNodes[0] as Text;
        let node2: Node = document.getElementById('paragraph28');
        let listNode2: Text = node2.childNodes[0] as Text;
        domSelection.setSelectionText(document, listNode1, listNode2, 0, 11);
        SelectionCommands.applyFormat(document, 'fontsize', parentDiv, '36px');
        expect(document.getElementById('paragraph27').parentElement.style.fontSize).toEqual('36px');
        expect(document.getElementById('paragraph28').parentElement.style.fontSize).toEqual('36px');
    });
    it('Apply Bold tag for cursor position with next element as empty', () => {
        let node1: Node = document.getElementById('paragraph29');
        let text1: Text = node1.childNodes[0].childNodes[0] as Text;
        ptag = node1;
        domSelection.setSelectionText(document, text1, text1, 11, 11);
        SelectionCommands.applyFormat(document, 'bold', parentDiv);
        expect((node1 as HTMLElement).querySelectorAll('strong').length).toEqual(1);
    });
});

describe('Selection Testing with Multiple nodes', () => {
    //HTML value
    let innervalue: string = '<p><strong>​<em>​<span style="text-decoration: underline;">​Testing</span></em>'
    + '</strong><br></p><p><strong><em><span style="text-decoration: underline;"><br></span></em></strong></p>';

    let rteEle: HTMLElement;
    let rteObj: any;
    let rteID: any;
    let boldItem: any;
    let italicItem: any;
    let underlineItem: any;

    beforeAll((done: Function) => {
        rteObj = renderRTE({
            value: innervalue,
            toolbarSettings: {
                items: ['Bold', 'Italic', 'Underline']
            },
            created: function() {
                rteID = document.body.querySelector('.e-richtexteditor').id;
                boldItem = document.body.querySelector('#' + rteID + '_toolbar_Bold')
                italicItem = document.body.querySelector('#' + rteID + '_toolbar_Italic')
                underlineItem = document.body.querySelector('#' + rteID + '_toolbar_Underline')
            }
        });
        done();
    });
    afterAll(() => {
        destroy(rteObj);
    });
    it('Checking the nodes innerHTML', (done) => {
        rteObj.inputElement.childNodes[1].focus();
        rteObj.formatter.editorManager.nodeSelection.setSelectionText(document, rteObj.inputElement.childNodes[1], rteObj.inputElement.childNodes[1], 0, 0);
        boldItem.click();
        expect(rteObj.inputElement.childNodes[1].firstElementChild.tagName.toLowerCase()).not.toBe('strong');
        italicItem.click();
        expect(rteObj.inputElement.childNodes[1].firstElementChild.tagName.toLowerCase()).not.toBe('em');
        underlineItem.click();
        expect(rteObj.inputElement.childNodes[1].firstElementChild.tagName.toLowerCase()).not.toBe('span');
        done();
    });
});

describe('Remove Br tags when applying formatting', () => {
    //HTML value
    let innervalue: string = '<p><br></p>';

    let rteEle: HTMLElement;
    let rteObj: any;
    let controlId: string;

    beforeAll((done: Function) => {
        rteObj = renderRTE({
            value: innervalue,
            toolbarSettings: {
                items: ['Bold', 'Italic', 'Underline']
            }
        });
        controlId = rteObj.element.id;
        done();
    });
    afterAll(() => {
        destroy(rteObj);
    });
    it('if value is empty', (done) => {
        rteObj.formatter.editorManager.nodeSelection.setSelectionText(document, rteObj.inputElement.childNodes[0], rteObj.inputElement.childNodes[0], 0, 0);
        let boldItem: HTMLElement = rteObj.element.querySelector('#' + controlId + '_toolbar_Bold');
        boldItem.click();
        expect(rteObj.inputElement.childNodes[0].firstElementChild.tagName.toLowerCase()).not.toBe('br');
        done();
    });
});

describe('Font size change with br', () => {
    let innervalue: string = `<div id="div1"><p id="paragraphfirst">line1</p><p><br></p><p>line 2 with previous as br</p><p>line 3</p><p><br></p><p><br></p><p>line 4 with two previous br</p><p>line 5</p><p><br></p><p><br></p><p id="paragraphlast"><br></p></div>`;
    let domSelection: NodeSelection = new NodeSelection();
    let divElement: HTMLDivElement = document.createElement('div');
    divElement.id = 'divElement';
    divElement.contentEditable = 'true';
    divElement.innerHTML = innervalue;
    let parentDiv: HTMLDivElement;

    beforeAll(() => {
        document.body.appendChild(divElement);
        parentDiv = document.getElementById('div1') as HTMLDivElement;
    });
    afterAll(() => {
        detach(divElement);
    });
    it('Apply fontsize elements with br', () => {
        let node1: Node = document.getElementById('paragraphfirst');
        let listNode1: Text = node1.childNodes[0] as Text;
        let node2: Node = document.getElementById('paragraphlast');
        let listNode2: Text = node2.childNodes[0] as Text;
        domSelection.setSelectionText(document, listNode1, listNode2, 0, 0);
        SelectionCommands.applyFormat(document, 'fontsize', parentDiv, '36px');
        let brelement = document.querySelectorAll('br');
        for (let i: number = 0; i < brelement.length; i++) {
            expect(brelement[i].parentElement.style.fontSize).toBe('36px');
        }
    });

    it('Apply fontsize elements with br for already applied styles', () => {
        let node1: Node = document.getElementById('paragraphfirst');
        let listNode1: Text = node1.childNodes[0] as Text;
        let node2: Node = document.getElementById('paragraphlast');
        let listNode2: Text = node2.childNodes[0] as Text;
        domSelection.setSelectionText(document, listNode1, listNode2, 0, 0);
        SelectionCommands.applyFormat(document, 'fontsize', parentDiv, '8px');
        let brelement = document.querySelectorAll('br');
        for (let i: number = 0; i < brelement.length; i++) {
            expect(brelement[i].parentElement.style.fontSize).toBe('8px');
        }
    });
});
describe('Bold the content', () => {
    let innervalue: string = `<p>The rich text editor component is WYSIWYG ("what you see is what you get") editor that provides the best user experience to create and update the content. 
    Users can format their content using standard toolbar commands.</p>
      <table contenteditable="false">
    <tbody><tr>
    <td>first row
      <table contenteditable="false">
        <tbody><tr>
          <td>
            <div contenteditable="true" id="nestedTable">editable content</div>
          </td>
        </tr>
      </tbody></table>
    </td>
    </tr>
    </tbody></table>`;
    let domSelection: NodeSelection = new NodeSelection();
    let divElement: HTMLDivElement = document.createElement('div');
    divElement.id = 'divElement';
    divElement.contentEditable = 'true';
    divElement.innerHTML = innervalue;
    let parentDiv: HTMLDivElement;

    beforeAll(() => {
        document.body.appendChild(divElement);
        parentDiv = document.getElementById('div1') as HTMLDivElement;
    });
    afterAll(() => {
        detach(divElement);
    });
    it('Apply Bold with parent element contenteditable as false', () => {
        let node1: Node = document.getElementById('nestedTable');
        let text1: Text = node1.childNodes[0] as Text;
        domSelection.setSelectionText(document, text1, text1, 1, 1);
        SelectionCommands.applyFormat(document, 'bold', parentDiv);
        expect(node1.childNodes[0].nodeName.toLowerCase()).toEqual('strong');
    });
});

describe('Bold the content inside table in fire fox', () => {
    let fireFox: string = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:84.0) Gecko/20100101 Firefox/84.0";
    let defaultUA: string = navigator.userAgent;
    
    let innervalue: string = `<table class="e-rte-table" style="width: 100%; min-width: 0px;"><tbody><tr><td style="width: 33.3333%;" class="">dfbfdb</td><td style="width: 33.3333%;" class="">dfbdfb</td><td style="width: 33.3333%;" class="">dfbfdb</td></tr><tr><td style="width: 33.3333%;"><br></td><td style="width: 33.3333%;"><br></td><td style="width: 33.3333%;"><br></td></tr><tr><td style="width: 33.3333%;"><br></td><td style="width: 33.3333%;"><br></td><td style="width: 33.3333%;"><br></td></tr></tbody></table><p><br></p>`;
    let domSelection: NodeSelection = new NodeSelection();
    let divElement: HTMLDivElement = document.createElement('div');
    divElement.id = 'divElement';
    divElement.contentEditable = 'true';
    divElement.innerHTML = innervalue;
    let parentDiv: HTMLDivElement;

    beforeAll(() => {
        Browser.userAgent = fireFox;
        document.body.appendChild(divElement);
        parentDiv = document.getElementById('divElement') as HTMLDivElement;
    });
    afterAll(() => {
        detach(divElement);
    });
    it('Apply bold to the content inside the table testing in firefox', () => {
        let node1: Node = document.querySelector('tr');
        domSelection.setSelectionText(document, node1, node1, 0, 3);
        SelectionCommands.applyFormat(document, 'bold', parentDiv);
        expect(node1.childNodes[0].childNodes[0].nodeName.toLowerCase()).toEqual('strong');
    });
});

describe('EJ2-46060: bold remove testing', () => {    
    let innervalue: string = `<p><strong><br></strong></p>`;
    let domSelection: NodeSelection = new NodeSelection();
    let divElement: HTMLDivElement = document.createElement('div');
    divElement.id = 'divElement';
    divElement.contentEditable = 'true';
    divElement.innerHTML = innervalue;

    beforeAll(() => {
        document.body.appendChild(divElement);
    });
    afterAll(() => {
        detach(divElement);
    });
    it('Remove bold', () => {
        let node1: Node = document.querySelector('strong');
        domSelection.setSelectionText(document, node1, node1, 0, 0);
        SelectionCommands.applyFormat(document, 'bold', divElement);
        expect(divElement.innerHTML).toEqual('<p><br></p>');
    });
});

describe('EJ2-46060: List not generated after enter key press and bold format changed', () => {
    let rteObj: any;
    let domSelection: NodeSelection = new NodeSelection();
    beforeEach(() => { });
    it(' Apply list', () => {
        rteObj = renderRTE({ value: '<p><strong>a</strong><br></p><p><strong><br></strong></p>' });
        let node1: Node = rteObj.element.querySelectorAll('.e-content p')[1];
        domSelection.setSelectionText(document, node1, node1, 0, 0);
        (rteObj.element.querySelectorAll(".e-toolbar-item")[0] as HTMLElement).click();
        (rteObj.element.querySelectorAll(".e-toolbar-item")[6] as HTMLElement).click();
        expect((rteObj.element.querySelector('.e-content') as HTMLElement).innerHTML.replace(/\uFEFF/g,"")).toBe('<p><strong>a</strong><br></p><ol><li><br></li></ol>');    
    });
    afterEach(() => {
        destroy(rteObj);
    });
});
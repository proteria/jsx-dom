import jsx = require('../index.cjs');
import svg = require('../svg.cjs');
import { expect } from 'chai';
import 'mocha';
import './pretest';

describe('jsx-dom', () => {

	it('creates a <div> element', () => {
		expect((<div id="hello">world</div>).outerHTML).to.equal('<div id="hello">world</div>');
	});

	it('supports functional components', () => {
		function Component(props: { a: 1, b: 2, c: 3 }) {
			expect(props.a).to.equal(1);
			expect(props.b).to.equal(2);
			expect(props.c).to.equal(3);
			expect((props as any).children).to.be.empty;
			return <div>{props.a + props.b + props.c}</div>;
		}

		expect((<Component a={1} b={2} c={3} />).innerHTML).to.equal('6');
	});

	describe('childNodes', () => {
		it('ignores `null`', () => {
			expect((<div>{null}</div>).children).to.be.empty;
		});

		it('supports deep nested childNodes', () => {
			expect((<div>{[2, 3]}</div>).textContent).to.equal('23');
			expect((<div>{[2, [2, '3', null, false, [4]]]}</div>).textContent).to.equal('2234');
		});

		it('supports DOM elements as childNode', () => {
			const img = document.createElement('img');
			const node = <div>{img}</div>;
			expect(node.children).to.have.lengthOf(1);
			expect(node.firstElementChild).to.equal(img);
		});

		it('supports string as childNode', () => {
			expect((<div>{'text'}</div>).textContent).to.equal('text');
		});
	});

	describe('className', () => {

		it('accepts both `class`, `className` as valid input for classes.', () => {
			expect((<div className="me irl" />).className).to.equal('me irl');
			expect((<div class="me too thanks" />).className).to.equal('me too thanks');
		});

		it('accepts an array as valid input for class', () => {
			expect((<div class={["first", "second"]} />).className).to.equal('first second');
		});

		it('expects a recursive array as valid input for classes', () => {
			expect((<div class={["first", ["second", false, "third"]]} />).className).to.equal('first second third');
		});

		it('accepts an object literal as a valid input', () => {
			const node = <div class={{
				included: true,
				excluded: false,
			}} />;

			expect(node.className).to.equal('included');
		});

		it('filters out falsy values, but not 0, from the class array', () => {
			const node = <div class={[
				(Math.PI < 3) && 'Hell is freezing over',
				([].length && 'should be 0'),
				'rest',
			]} />;

			expect(node.className).to.equal('0 rest');
		});

	});

	describe('attributes', () => {
		it('supports boolean attributes', () => {
			expect((<input disabled={true} />).getAttribute('disabled')).to.equal('');
			expect((<input disabled={false} />).getAttribute('disabled')).to.equal(null);
		});

		it('supports dataset', () => {
			expect((<div data-key="value" />).dataset.key).to.equal('value');
			expect((<div dataset={{ key: 0 }} />).getAttribute('data-key')).to.equal('0');
		});

		it('supports innerHTML, innerText and textContent', () => {
			expect((<div innerHTML="<div></div><div></div>" />).querySelectorAll('div').length).to.equal(2);
			expect((<div innerText="<img>" />).querySelectorAll('img')).to.be.empty;
			expect((<div innerText="<img>" />).textContent).to.equal('<img>');
			expect((<div textContent="<img>" />).querySelectorAll('img')).to.be.empty;
		})

		it('supports ref store function', () => {
			let button = null;
			const div = <div><button ref={ e => button = e }/></div>;
			expect(button).not.to.equal(null);
			expect(div.children[0]).to.equal(button);
		});

		it('supports ref in functional components', () => {
			let button = null;
			const Button = () => <button/>;
			const div = <div><Button ref={ e => button = e }/></div>;
			expect(button).not.to.equal(null);
			expect(div.children[0]).to.equal(button);
		});

		it('supports spellCheck attribute', () => {
			expect((<input spellCheck={true} />).spellcheck).to.equal(true);
			expect((<input spellCheck={false} />).spellcheck).to.equal(false);
			expect((<textarea spellCheck={true} />).spellcheck).to.equal(true);
			expect((<textarea spellCheck={false} />).spellcheck).to.equal(false);
		});
	});

	describe('styles', () => {
		it('supports style object', () => {
			expect((<div style={{ display: 'none' }} />).style.display).to.equal('none');
		});

		it('supports style string', () => {
			const el = <div style="display: none; margin: 1px;" />;
			expect(el.style.display).to.equal('none');
			expect(el.style.margin).to.equal('1px');
		});
	});

	describe('events', () => {
		it('supports event listeners', (done) => {
			const button = <button onClick={() => done()} /> as HTMLButtonElement;
			button.click();
		});
	});

	describe('SVG', () => {
		const namespace = jsx.SVGNamespace;

		it('exports the correct SVG namespace URI', () => {
			expect(namespace).to.equal('http://www.w3.org/2000/svg');
		});

		it('supports SVG elements', () => {
			const jsx = svg;
			const supportedElements = [
				<svg />, <animate />, <circle />, <clipPath />, <defs />, <desc />, <ellipse />,
				<feBlend />, <feColorMatrix />, <feComponentTransfer />, <feComposite />,
				<feConvolveMatrix />, <feDiffuseLighting />, <feDisplacementMap />, <feDistantLight />,
				<feFlood />, <feFuncA />, <feFuncB />, <feFuncG />, <feFuncR />, <feGaussianBlur />,
				<feImage />, <feMerge />, <feMergeNode />, <feMorphology />, <feOffset />, <fePointLight />,
				<feSpecularLighting />, <feSpotLight />, <feTile />, <feTurbulence />, <filter />,
				<foreignObject />, <g />, <image />, <line />, <linearGradient />, <marker />, <mask />,
				<metadata />, <path />, <pattern />, <polygon />, <polyline />, <radialGradient />,
				<rect />, <stop />, <switch />, <symbol />, <text />, <textPath />, <tspan />, <use />,
				<view />
			];

			supportedElements.forEach(one =>
				expect(one.namespaceURI, `Tag: ${one.tagName}`).to.equal(namespace)
			);
		});

		it('supports SVG namespace', () => {
			expect((<a namespaceURI={namespace} />).namespaceURI).to.equal(namespace);
		});
	});

	describe('public API', () => {
		it('exports a DOM object', () => {
			expect(jsx.DOM).to.be.an('object');
		});

		it('exports `createElement` as well as `h`', () => {
			expect(jsx.h).to.equal(jsx.createElement);
			expect(jsx.h('div').outerHTML).to.equal('<div></div>');
		});

		it('exported DOM object creates correct elements', () => {
			for (const tag of [
				'a', 'blockquote', 'button', 'div', 'em',
				'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'img',
				'input', 'li', 'link', 'ol', 'p', 'script', 'span', 'strong',
				'table', 'thead', 'td', 'th', 'tr', 'ul',
			]) {
				expect(jsx.DOM[tag]().tagName).to.equal(tag.toUpperCase());
			}
		});

		it('exported DOM object supports spreaded childNodes', () => {
			expect(jsx.DOM.div('Hello ', 'world', '!').textContent).to.equal('Hello world!');
		});

		it('attr is optional', () => {
			const el = (jsx.DOM as any).h3('Hello World') as HTMLHeadingElement;
			expect(el.childNodes).to.have.lengthOf(1);
			expect(el.childElementCount).to.equal(0);
			expect(el.firstChild.nodeType).to.equal(3);
			expect(el.textContent).to.equal('Hello World');
		});
	});
});

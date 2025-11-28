/**
 * Custom Element Wrapper for CalendarWheel
 * 
 * Creates <s2g-calendar-wheel> custom element with timezone and theme props.
 * This allows the component to be used as a web component in any framework.
 */

import CalendarWheel from './CalendarWheel';
import { createRoot, Root } from 'react-dom/client';
import './CalendarWheel.css';

interface CalendarWheelElementAttributes {
  timezone?: string;
  theme?: 'light' | 'dark' | 'auto';
  size?: string;
}

class CalendarWheelElement extends HTMLElement {
  private root: Root | null = null;
  private observer: MutationObserver | null = null;

  static get observedAttributes(): string[] {
    return ['timezone', 'theme', 'size'];
  }

  connectedCallback() {
    const props = this.getProps();
    this.root = createRoot(this);
    this.render(props);

    // Watch for attribute changes
    this.observer = new MutationObserver(() => {
      const newProps = this.getProps();
      this.render(newProps);
    });
    this.observer.observe(this, { attributes: true, attributeFilter: ['timezone', 'theme', 'size'] });
  }

  disconnectedCallback() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }

  attributeChangedCallback() {
    if (this.root) {
      const props = this.getProps();
      this.render(props);
    }
  }

  private getProps(): CalendarWheelElementAttributes {
    return {
      timezone: this.getAttribute('timezone') || undefined,
      theme: (this.getAttribute('theme') as 'light' | 'dark' | 'auto') || 'auto',
      size: this.getAttribute('size') || undefined,
    };
  }

  private render(props: CalendarWheelElementAttributes) {
    if (!this.root) return;

    const size = props.size ? parseInt(props.size, 10) : 400;

    this.root.render(
      <CalendarWheel
        timezone={props.timezone}
        theme={props.theme}
        size={size}
        className="calendar-wheel-element"
      />
    );
  }
}

// Register the custom element
if (!customElements.get('s2g-calendar-wheel')) {
  customElements.define('s2g-calendar-wheel', CalendarWheelElement);
}

export default CalendarWheelElement;


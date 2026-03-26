/**
 * Lab shared controls tests.
 *
 * @vitest-environment happy-dom
 * @module lab/components/shared
 * @layer L2
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import {
  LiquidToggle,
  GlowCheckbox,
  GlowRadio,
  GlowInput,
  GlowSelect,
  GlowSlider,
} from './controls';

describe('LiquidToggle', () => {
  it('renders with label text', () => {
    render(<LiquidToggle label="Dark Mode" />);
    expect(screen.getByText('Dark Mode')).toBeTruthy();
  });

  it('has correct aria-checked reflecting initial state', () => {
    render(<LiquidToggle label="Toggle" defaultOn={false} />);
    const toggle = screen.getByRole('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('false');
  });

  it('toggles on click and calls onChange', () => {
    const onChange = vi.fn();
    render(<LiquidToggle label="Toggle" onChange={onChange} />);
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });

  it('respects controlled checked prop', () => {
    render(<LiquidToggle label="Toggle" checked={true} />);
    const toggle = screen.getByRole('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });
});

describe('GlowCheckbox', () => {
  it('renders with label text', () => {
    render(<GlowCheckbox label="Accept terms" />);
    expect(screen.getByText('Accept terms')).toBeTruthy();
  });

  it('toggles on click and calls onChange', () => {
    const onChange = vi.fn();
    render(<GlowCheckbox label="Check" onChange={onChange} />);
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox.closest('label')!);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('reflects controlled checked state', () => {
    render(<GlowCheckbox label="Check" checked={true} />);
    expect(screen.getByRole('checkbox').getAttribute('aria-checked')).toBe('true');
  });
});

describe('GlowRadio', () => {
  it('renders all options', () => {
    render(<GlowRadio options={['A', 'B', 'C']} name="test" />);
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByText('B')).toBeTruthy();
    expect(screen.getByText('C')).toBeTruthy();
  });

  it('selects first option by default', () => {
    render(<GlowRadio options={['X', 'Y']} name="r" />);
    const radios = screen.getAllByRole('radio');
    expect(radios[0].getAttribute('aria-checked')).toBe('true');
    expect(radios[1].getAttribute('aria-checked')).toBe('false');
  });

  it('calls onChange when option is clicked', () => {
    const onChange = vi.fn();
    render(<GlowRadio options={['X', 'Y']} name="r" onChange={onChange} />);
    fireEvent.click(screen.getByText('Y').closest('label')!);
    expect(onChange).toHaveBeenCalledWith('Y');
  });
});

describe('GlowInput', () => {
  it('renders an input with placeholder', () => {
    render(<GlowInput placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeTruthy();
  });

  it('calls onChange with value', () => {
    const onChange = vi.fn();
    render(<GlowInput placeholder="Type" onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Type'), { target: { value: 'hello' } });
    expect(onChange).toHaveBeenCalledWith('hello');
  });

  it('has correct aria-label from placeholder', () => {
    render(<GlowInput placeholder="Search" />);
    expect(screen.getByLabelText('Search')).toBeTruthy();
  });
});

describe('GlowSelect', () => {
  it('renders with selected value shown', () => {
    render(<GlowSelect options={['Red', 'Blue', 'Green']} />);
    expect(screen.getByText('Red')).toBeTruthy();
  });

  it('opens dropdown on click and shows all options', () => {
    render(<GlowSelect options={['Red', 'Blue']} />);
    fireEvent.click(screen.getByRole('combobox'));
    const options = screen.getAllByRole('option');
    expect(options.length).toBe(2);
  });

  it('calls onChange when an option is selected', () => {
    const onChange = vi.fn();
    render(<GlowSelect options={['Red', 'Blue']} onChange={onChange} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getAllByRole('option')[1]);
    expect(onChange).toHaveBeenCalledWith('Blue');
  });
});

describe('GlowSlider', () => {
  it('renders with label', () => {
    render(<GlowSlider label="Volume" />);
    expect(screen.getByText('Volume')).toBeTruthy();
  });

  it('displays the current value', () => {
    render(<GlowSlider label="Opacity" initial={75} />);
    expect(screen.getByText('75')).toBeTruthy();
  });

  it('calls onChange when slider is adjusted', () => {
    const onChange = vi.fn();
    render(<GlowSlider label="Size" min={0} max={100} initial={50} onChange={onChange} />);
    const slider = screen.getByLabelText('Size');
    fireEvent.change(slider, { target: { value: '80' } });
    expect(onChange).toHaveBeenCalledWith(80);
  });
});

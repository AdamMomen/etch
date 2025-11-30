import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the NAMELESS title', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { name: /nameless/i })
    ).toBeInTheDocument()
  })

  it('renders Create Meeting button', () => {
    render(<App />)
    expect(
      screen.getByRole('button', { name: /create meeting/i })
    ).toBeInTheDocument()
  })

  it('renders Join Meeting button', () => {
    render(<App />)
    expect(
      screen.getByRole('button', { name: /join meeting/i })
    ).toBeInTheDocument()
  })

  it('displays the product description', () => {
    render(<App />)
    expect(
      screen.getByText(/open-source, self-hosted meeting platform/i)
    ).toBeInTheDocument()
  })

  it('shows feature indicators', () => {
    render(<App />)
    expect(screen.getByText('Self-hosted')).toBeInTheDocument()
    expect(screen.getByText('Real-time')).toBeInTheDocument()
    expect(screen.getByText('Annotations')).toBeInTheDocument()
  })
})

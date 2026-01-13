import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '@/App'

describe('App', () => {
  it('renders the Etch heading', () => {
    render(<App />)

    expect(screen.getByText('Etch')).toBeInTheDocument()
  })

  it('renders the tagline', () => {
    render(<App />)

    expect(
      screen.getByText(/open-source, self-hosted meeting platform/i)
    ).toBeInTheDocument()
  })

  it('renders Start Meeting button', () => {
    render(<App />)

    expect(
      screen.getByRole('button', { name: /start meeting/i })
    ).toBeInTheDocument()
  })

  it('renders Join button', () => {
    render(<App />)

    expect(screen.getByRole('button', { name: /^join$/i })).toBeInTheDocument()
  })

  it('renders room code input', () => {
    render(<App />)

    expect(
      screen.getByPlaceholderText(/enter room code or link/i)
    ).toBeInTheDocument()
  })
})

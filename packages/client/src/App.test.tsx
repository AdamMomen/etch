import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the NAMELESS heading', () => {
    render(<App />)

    expect(screen.getByText('NAMELESS')).toBeInTheDocument()
  })

  it('renders the tagline', () => {
    render(<App />)

    expect(
      screen.getByText(/open-source, self-hosted meeting platform/i)
    ).toBeInTheDocument()
  })

  it('renders Create Meeting button', () => {
    render(<App />)

    expect(screen.getByText('Create Meeting')).toBeInTheDocument()
  })

  it('renders Join Meeting button', () => {
    render(<App />)

    expect(screen.getByText('Join Meeting')).toBeInTheDocument()
  })
})

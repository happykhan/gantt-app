import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { makeLargeProject } from '../test/fixtures/largeProject'
import CustomGantt from './CustomGantt'

describe('CustomGantt large projects', () => {
  it('renders and selects a task in the 250-task fixture responsively', () => {
    const onTaskClick = vi.fn()
    const started = performance.now()
    render(<CustomGantt tasks={makeLargeProject()} availableWidth={1440} onTaskClick={onTaskClick} />)
    const taskBars = screen.getAllByTestId('gantt-task')
    const renderTime = performance.now() - started

    expect(taskBars).toHaveLength(250)
    expect(renderTime).toBeLessThan(1500)

    fireEvent.mouseDown(taskBars[249], { button: 0, clientX: 100 })
    fireEvent.mouseUp(window, { clientX: 100 })
    expect(onTaskClick).toHaveBeenCalledWith('task-250')
  })
})

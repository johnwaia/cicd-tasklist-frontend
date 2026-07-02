import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TaskItem } from '../components/TaskItem';
import type { Task } from '../types/task';

const baseTask: Task = {
	id: 1,
	title: 'Première tâche',
	description: 'Description 1',
	completed: false,
	createdAt: '2026-01-15T10:00:00Z',
	updatedAt: '2026-01-15T10:00:00Z',
};

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('TaskItem', () => {
	it('renders the task title, description and date', () => {
		render(<TaskItem task={baseTask} onToggle={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);
		expect(screen.getByText('Première tâche')).toBeInTheDocument();
		expect(screen.getByText('Description 1')).toBeInTheDocument();
	});

	it('does not render a description paragraph when null', () => {
		render(
			<TaskItem
				task={{ ...baseTask, description: null }}
				onToggle={vi.fn()}
				onDelete={vi.fn()}
				onEdit={vi.fn()}
			/>
		);
		expect(screen.queryByText('Description 1')).not.toBeInTheDocument();
	});

	it('calls onToggle when the checkbox is clicked', () => {
		const onToggle = vi.fn();
		render(<TaskItem task={baseTask} onToggle={onToggle} onDelete={vi.fn()} onEdit={vi.fn()} />);
		fireEvent.click(screen.getByRole('checkbox'));
		expect(onToggle).toHaveBeenCalledWith(1);
	});

	it('applies the completed class when the task is completed', () => {
		render(
			<TaskItem
				task={{ ...baseTask, completed: true }}
				onToggle={vi.fn()}
				onDelete={vi.fn()}
				onEdit={vi.fn()}
			/>
		);
		expect(screen.getByTestId('task-item')).toHaveClass('task-completed');
	});

	it('enters edit mode and saves the new title/description', () => {
		const onEdit = vi.fn();
		render(<TaskItem task={baseTask} onToggle={vi.fn()} onDelete={vi.fn()} onEdit={onEdit} />);

		fireEvent.click(screen.getByLabelText('Modifier'));
		fireEvent.change(screen.getByLabelText('Modifier le titre'), { target: { value: 'Updated title' } });
		fireEvent.change(screen.getByLabelText('Modifier la description'), { target: { value: 'Updated desc' } });
		fireEvent.click(screen.getByText('Enregistrer'));

		expect(onEdit).toHaveBeenCalledWith(1, { title: 'Updated title', description: 'Updated desc' });
		expect(screen.queryByLabelText('Modifier le titre')).not.toBeInTheDocument();
	});

	it('does not save when the edited title is blank', () => {
		const onEdit = vi.fn();
		render(<TaskItem task={baseTask} onToggle={vi.fn()} onDelete={vi.fn()} onEdit={onEdit} />);

		fireEvent.click(screen.getByLabelText('Modifier'));
		fireEvent.change(screen.getByLabelText('Modifier le titre'), { target: { value: '   ' } });
		fireEvent.click(screen.getByText('Enregistrer'));

		expect(onEdit).not.toHaveBeenCalled();
	});

	it('cancels edit mode and restores original values', () => {
		render(<TaskItem task={baseTask} onToggle={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);

		fireEvent.click(screen.getByLabelText('Modifier'));
		fireEvent.change(screen.getByLabelText('Modifier le titre'), { target: { value: 'Discarded' } });
		fireEvent.click(screen.getByText('Annuler'));

		expect(screen.queryByLabelText('Modifier le titre')).not.toBeInTheDocument();
		expect(screen.getByText('Première tâche')).toBeInTheDocument();
	});

	it('requires a second click to delete, and resets after a timeout', () => {
		const onDelete = vi.fn();
		render(<TaskItem task={baseTask} onToggle={vi.fn()} onDelete={onDelete} onEdit={vi.fn()} />);

		const deleteButton = screen.getByLabelText('Supprimer');
		fireEvent.click(deleteButton);
		expect(onDelete).not.toHaveBeenCalled();

		fireEvent.click(deleteButton);
		expect(onDelete).toHaveBeenCalledWith(1);
	});

	it('resets the delete confirmation after 3 seconds', () => {
		render(<TaskItem task={baseTask} onToggle={vi.fn()} onDelete={vi.fn()} onEdit={vi.fn()} />);

		const deleteButton = screen.getByLabelText('Supprimer');
		fireEvent.click(deleteButton);
		expect(deleteButton).toHaveTextContent('⚠️');

		act(() => {
			vi.advanceTimersByTime(3000);
		});
		expect(deleteButton).toHaveTextContent('🗑️');
	});
});

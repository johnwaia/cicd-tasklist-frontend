import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../App';
import * as taskApi from '../api/taskApi';
import type { Task } from '../types/task';

const mockTask: Task = {
	id: 1,
	title: 'Première tâche',
	description: null,
	completed: false,
	createdAt: '2026-01-15T10:00:00Z',
	updatedAt: '2026-01-15T10:00:00Z',
};

beforeEach(() => {
	vi.restoreAllMocks();
});

describe('App', () => {
	it('renders header stats and the task list once tasks load', async () => {
		vi.spyOn(taskApi, 'getTasks').mockResolvedValue([mockTask, { ...mockTask, id: 2, completed: true }]);

		render(<App />);

		await waitFor(() => expect(screen.getByTestId('task-list')).toBeInTheDocument());
		expect(screen.getByText('Mes Tâches')).toBeInTheDocument();
		expect(screen.getByText('Total')).toBeInTheDocument();
		expect(screen.getByText('Terminées')).toBeInTheDocument();
	});

	it('does not render header stats when there are no tasks', async () => {
		vi.spyOn(taskApi, 'getTasks').mockResolvedValue([]);

		render(<App />);

		await waitFor(() => expect(screen.getByTestId('empty')).toBeInTheDocument());
		expect(screen.queryByText('Total')).not.toBeInTheDocument();
	});

	it('adds a task via the form without throwing when addTask fails', async () => {
		vi.spyOn(taskApi, 'getTasks').mockResolvedValue([]);
		vi.spyOn(taskApi, 'createTask').mockRejectedValue(new Error('fail'));

		render(<App />);
		await waitFor(() => expect(screen.getByTestId('empty')).toBeInTheDocument());

		fireEvent.change(screen.getByLabelText('Titre'), { target: { value: 'New task' } });
		fireEvent.submit(screen.getByTestId('task-form'));

		await waitFor(() => expect(taskApi.createTask).toHaveBeenCalled());
	});
});

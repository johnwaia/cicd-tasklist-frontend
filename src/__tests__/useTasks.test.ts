import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTasks } from '../hooks/useTasks';
import * as taskApi from '../api/taskApi';
import type { Task } from '../types/task';

const mockTask: Task = {
	id: 1,
	title: 'Test',
	description: null,
	completed: false,
	createdAt: '2026-01-15T10:00:00Z',
	updatedAt: '2026-01-15T10:00:00Z',
};

beforeEach(() => {
	vi.restoreAllMocks();
});

describe('useTasks', () => {
	it('loads tasks on mount', async () => {
		vi.spyOn(taskApi, 'getTasks').mockResolvedValue([mockTask]);

		const { result } = renderHook(() => useTasks());
		expect(result.current.loading).toBe(true);

		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.tasks).toEqual([mockTask]);
		expect(result.current.error).toBeNull();
	});

	it('sets an error message when loading fails', async () => {
		vi.spyOn(taskApi, 'getTasks').mockRejectedValue(new Error('Boom'));

		const { result } = renderHook(() => useTasks());
		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.error).toBe('Boom');
	});

	it('sets a generic error message for non-Error rejections', async () => {
		vi.spyOn(taskApi, 'getTasks').mockRejectedValue('not an error');

		const { result } = renderHook(() => useTasks());
		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.error).toBe('Une erreur est survenue');
	});

	it('addTask prepends the new task to the list', async () => {
		vi.spyOn(taskApi, 'getTasks').mockResolvedValue([]);
		const created = { ...mockTask, id: 2, title: 'New' };
		vi.spyOn(taskApi, 'createTask').mockResolvedValue(created);

		const { result } = renderHook(() => useTasks());
		await waitFor(() => expect(result.current.loading).toBe(false));

		await act(async () => {
			await result.current.addTask({ title: 'New' });
		});

		expect(result.current.tasks).toEqual([created]);
	});

	it('editTask updates the matching task', async () => {
		vi.spyOn(taskApi, 'getTasks').mockResolvedValue([mockTask]);
		const updated = { ...mockTask, title: 'Updated' };
		vi.spyOn(taskApi, 'updateTask').mockResolvedValue(updated);

		const { result } = renderHook(() => useTasks());
		await waitFor(() => expect(result.current.loading).toBe(false));

		await act(async () => {
			await result.current.editTask(1, { title: 'Updated' });
		});

		expect(result.current.tasks).toEqual([updated]);
	});

	it('removeTask deletes the matching task', async () => {
		vi.spyOn(taskApi, 'getTasks').mockResolvedValue([mockTask]);
		vi.spyOn(taskApi, 'deleteTask').mockResolvedValue(undefined);

		const { result } = renderHook(() => useTasks());
		await waitFor(() => expect(result.current.loading).toBe(false));

		await act(async () => {
			await result.current.removeTask(1);
		});

		expect(result.current.tasks).toEqual([]);
	});

	it('toggleComplete flips the completed flag for an existing task', async () => {
		vi.spyOn(taskApi, 'getTasks').mockResolvedValue([mockTask]);
		const toggled = { ...mockTask, completed: true };
		vi.spyOn(taskApi, 'updateTask').mockResolvedValue(toggled);

		const { result } = renderHook(() => useTasks());
		await waitFor(() => expect(result.current.loading).toBe(false));

		await act(async () => {
			await result.current.toggleComplete(1);
		});

		expect(taskApi.updateTask).toHaveBeenCalledWith(1, { completed: true });
		expect(result.current.tasks).toEqual([toggled]);
	});

	it('toggleComplete does nothing when the task is not found', async () => {
		vi.spyOn(taskApi, 'getTasks').mockResolvedValue([mockTask]);
		const updateSpy = vi.spyOn(taskApi, 'updateTask');

		const { result } = renderHook(() => useTasks());
		await waitFor(() => expect(result.current.loading).toBe(false));

		await act(async () => {
			await result.current.toggleComplete(999);
		});

		expect(updateSpy).not.toHaveBeenCalled();
	});
});

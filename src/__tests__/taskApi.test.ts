import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTasks, getTask, createTask, updateTask, deleteTask } from '../api/taskApi';

const mockTask = {
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

describe('taskApi', () => {
	it('getTasks returns array', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve([mockTask]),
			})
		);

		const tasks = await getTasks();
		expect(tasks).toEqual([mockTask]);
		expect(fetch).toHaveBeenCalledWith('/api/tasks');
	});

	it('getTask returns a single task', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockTask),
			})
		);

		const task = await getTask(1);
		expect(task).toEqual(mockTask);
		expect(fetch).toHaveBeenCalledWith('/api/tasks/1');
	});

	it('createTask posts the payload and returns the created task', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(mockTask),
			})
		);

		const task = await createTask({ title: 'Test' });
		expect(task).toEqual(mockTask);
		expect(fetch).toHaveBeenCalledWith('/api/tasks', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ title: 'Test' }),
		});
	});

	it('updateTask puts the payload and returns the updated task', async () => {
		const updated = { ...mockTask, completed: true };
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(updated),
			})
		);

		const task = await updateTask(1, { completed: true });
		expect(task).toEqual(updated);
		expect(fetch).toHaveBeenCalledWith('/api/tasks/1', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ completed: true }),
		});
	});

	it('deleteTask sends a DELETE request', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({ ok: true })
		);

		await deleteTask(1);
		expect(fetch).toHaveBeenCalledWith('/api/tasks/1', { method: 'DELETE' });
	});

	it('getTasks throws an error when the response is not ok', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
				text: () => Promise.resolve('Server error'),
			})
		);

		await expect(getTasks()).rejects.toThrow('HTTP 500: Server error');
	});

	it('deleteTask throws an error when the response is not ok', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				status: 404,
				text: () => Promise.resolve('Not found'),
			})
		);

		await expect(deleteTask(1)).rejects.toThrow('HTTP 404: Not found');
	});
});

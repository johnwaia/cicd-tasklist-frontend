import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TaskForm } from '../components/TaskForm';

describe('TaskForm', () => {
	it('renders create mode by default', () => {
		render(<TaskForm onSubmit={vi.fn()} />);
		expect(screen.getByText('Nouvelle tâche')).toBeInTheDocument();
		expect(screen.getByText('Ajouter')).toBeInTheDocument();
	});

	it('shows a validation error when submitting without a title', () => {
		const onSubmit = vi.fn();
		render(<TaskForm onSubmit={onSubmit} />);
		fireEvent.submit(screen.getByTestId('task-form'));
		expect(screen.getByRole('alert')).toHaveTextContent('Le titre est requis');
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('clears the validation error once the user types a title', () => {
		render(<TaskForm onSubmit={vi.fn()} />);
		fireEvent.submit(screen.getByTestId('task-form'));
		expect(screen.getByRole('alert')).toBeInTheDocument();
		fireEvent.change(screen.getByLabelText('Titre'), { target: { value: 'New title' } });
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});

	it('submits trimmed title and description and resets fields in create mode', () => {
		const onSubmit = vi.fn();
		render(<TaskForm onSubmit={onSubmit} />);
		fireEvent.change(screen.getByLabelText('Titre'), { target: { value: '  My task  ' } });
		fireEvent.change(screen.getByLabelText('Description'), { target: { value: '  My desc  ' } });
		fireEvent.submit(screen.getByTestId('task-form'));

		expect(onSubmit).toHaveBeenCalledWith({ title: 'My task', description: 'My desc' });
		expect(screen.getByLabelText('Titre')).toHaveValue('');
		expect(screen.getByLabelText('Description')).toHaveValue('');
	});

	it('submits with undefined description when left blank', () => {
		const onSubmit = vi.fn();
		render(<TaskForm onSubmit={onSubmit} />);
		fireEvent.change(screen.getByLabelText('Titre'), { target: { value: 'Task only' } });
		fireEvent.submit(screen.getByTestId('task-form'));

		expect(onSubmit).toHaveBeenCalledWith({ title: 'Task only', description: undefined });
	});

	it('renders edit mode with initial values and does not reset fields on submit', () => {
		const onSubmit = vi.fn();
		render(
			<TaskForm
				onSubmit={onSubmit}
				mode="edit"
				initialValues={{ title: 'Existing', description: 'Existing desc' }}
			/>
		);
		expect(screen.getByText('Modifier la tâche')).toBeInTheDocument();
		expect(screen.getByLabelText('Titre')).toHaveValue('Existing');

		fireEvent.submit(screen.getByTestId('task-form'));
		expect(onSubmit).toHaveBeenCalledWith({ title: 'Existing', description: 'Existing desc' });
		expect(screen.getByLabelText('Titre')).toHaveValue('Existing');
	});

	it('calls onCancel when the cancel button is clicked', () => {
		const onCancel = vi.fn();
		render(<TaskForm onSubmit={vi.fn()} onCancel={onCancel} />);
		fireEvent.click(screen.getByText('Annuler'));
		expect(onCancel).toHaveBeenCalled();
	});

	it('does not render a cancel button when onCancel is not provided', () => {
		render(<TaskForm onSubmit={vi.fn()} />);
		expect(screen.queryByText('Annuler')).not.toBeInTheDocument();
	});
});

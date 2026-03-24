/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfirmDialog } from '../ConfirmDialog';

describe('ConfirmDialog Component', () => {
    const mockOnClose = jest.fn();
    const mockOnConfirm = jest.fn();

    beforeEach(() => {
        mockOnClose.mockClear();
        mockOnConfirm.mockClear();
    });

    it('should render with title and message', () => {
        render(
            <ConfirmDialog
                isOpen={true}
                onClose={mockOnClose}
                onConfirm={mockOnConfirm}
                title="Confirm Action"
                message="Are you sure?"
            />
        );

        expect(screen.getByText('Confirm Action')).toBeInTheDocument();
        expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    });

    it('should call onConfirm when confirm button is clicked', () => {
        render(
            <ConfirmDialog
                isOpen={true}
                onClose={mockOnClose}
                onConfirm={mockOnConfirm}
                title="Confirm"
                message="Proceed?"
            />
        );

        const confirmButton = screen.getByText('Confirmar');
        fireEvent.click(confirmButton);

        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when cancel button is clicked', () => {
        render(
            <ConfirmDialog
                isOpen={true}
                onClose={mockOnClose}
                onConfirm={mockOnConfirm}
                title="Confirm"
                message="Proceed?"
            />
        );

        const cancelButton = screen.getByText('Cancelar');
        fireEvent.click(cancelButton);

        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should show custom button texts', () => {
        render(
            <ConfirmDialog
                isOpen={true}
                onClose={mockOnClose}
                onConfirm={mockOnConfirm}
                title="Delete"
                message="Delete this item?"
                confirmText="Delete"
                cancelText="Keep"
            />
        );

        expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Keep' })).toBeInTheDocument();
    });

    it('should disable buttons when loading', () => {
        render(
            <ConfirmDialog
                isOpen={true}
                onClose={mockOnClose}
                onConfirm={mockOnConfirm}
                title="Processing"
                message="Please wait..."
                isLoading={true}
            />
        );

        const confirmButton = screen.getByText('Procesando...');
        const cancelButton = screen.getByText('Cancelar');

        expect(confirmButton).toBeDisabled();
        expect(cancelButton).toBeDisabled();
    });

    it('should render with danger variant', () => {
        render(
            <ConfirmDialog
                isOpen={true}
                onClose={mockOnClose}
                onConfirm={mockOnConfirm}
                title="Delete"
                message="This action cannot be undone"
                variant="danger"
            />
        );

        expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should render with success variant', () => {
        render(
            <ConfirmDialog
                isOpen={true}
                onClose={mockOnClose}
                onConfirm={mockOnConfirm}
                title="Approve"
                message="Approve this request?"
                variant="success"
            />
        );

        expect(screen.getByText('Approve')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
        const { container } = render(
            <ConfirmDialog
                isOpen={false}
                onClose={mockOnClose}
                onConfirm={mockOnConfirm}
                title="Test"
                message="Test message"
            />
        );

        expect(container.firstChild).toBeNull();
    });
});

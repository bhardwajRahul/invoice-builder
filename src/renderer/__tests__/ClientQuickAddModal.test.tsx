import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../i18n';
import { ClientQuickAddModal } from '../pages/invoices/Form/Modals/ClientQuickAddModal';
import type { Client } from '../shared/types/client';
import type { Response } from '../shared/types/response';
import { store } from '../state/configureStore';

const mockExecute = vi.fn();
let capturedOnDone: ((data: Response<Client>) => void) | undefined;
let mockLoading = false;

vi.mock('../shared/hooks/clients/useClientAdd', () => ({
  useClientAdd: (params: { onDone?: (data: Response<Client>) => void }) => {
    capturedOnDone = params.onDone;
    return { execute: mockExecute, loading: mockLoading, data: undefined };
  }
}));

const fakeClient: Client = {
  id: 42,
  name: 'Acme Corp',
  shortName: 'AC',
  phone: '+14155552671',
  invoiceCount: 0,
  quotesCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  isArchived: false
};

const renderModal = (props: Partial<ComponentProps<typeof ClientQuickAddModal>> = {}) => {
  const onCreated = vi.fn();
  const onCancel = vi.fn();
  render(
    <Provider store={store}>
      <I18nextProvider i18n={i18n}>
        <ClientQuickAddModal isOpen onCancel={onCancel} onCreated={onCreated} {...props} />
      </I18nextProvider>
    </Provider>
  );
  return { onCreated, onCancel };
};

describe('ClientQuickAddModal', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    capturedOnDone = undefined;
    mockLoading = false;
  });

  it('keeps Save disabled when name is empty', () => {
    renderModal();
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('creates a client and calls onCreated on success', async () => {
    const { onCreated } = renderModal();

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Acme Corp' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(mockExecute).toHaveBeenCalledTimes(1));
    capturedOnDone?.({ success: true, data: fakeClient });

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(fakeClient));
  });

  it('does not call onCreated when the API fails', async () => {
    const { onCreated } = renderModal();

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Acme Corp' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(mockExecute).toHaveBeenCalledTimes(1));
    capturedOnDone?.({ success: false, key: 'error.failed' });

    expect(onCreated).not.toHaveBeenCalled();
  });

  it('shows validation error for invalid phone when provided', () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Acme Corp' } });
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: 'not-a-phone' } });
    fireEvent.blur(screen.getByLabelText(/phone/i));

    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('submits at most once when Save is clicked twice in succession', async () => {
    renderModal();

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Acme Corp' } });
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);
    fireEvent.click(saveButton);

    await waitFor(() => expect(mockExecute).toHaveBeenCalledTimes(1));
  });
});

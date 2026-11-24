import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import fs from 'fs';
import path from 'path';
import Register from './screens/Register';
import { AuthUI } from './components/ui/auth-fuse';

describe('ROXX TECHNORITI Security Regression Suite', () => {
  test('Register enforces 12-digit numeric UTR and omits phone PII from external QR URL', () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/Sujal Kumar/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText(/24103123001/i), { target: { value: '24103123001' } });
    fireEvent.change(screen.getByPlaceholderText(/9876543210/i), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByPlaceholderText(/Bhagalpur College of Engineering/i), { target: { value: 'BCE Bhagalpur' } });
    fireEvent.change(screen.getByPlaceholderText(/Electronics & Communication/i), { target: { value: 'CSE' } });

    fireEvent.click(screen.getByRole('button', { name: /PROCEED TO PAYMENT GATEWAY/i }));

    // External QR URL must not include participant phone number
    const qrImg = screen.getByAltText('UPI Payment QR Code');
    expect(qrImg.getAttribute('src')).toContain('api.qrserver.com');
    expect(qrImg.getAttribute('src')).not.toContain('9876543210');

    // UTR input strips non-digits and enforces 12 digits
    const utrInput = screen.getByPlaceholderText(/432109876543/i);
    fireEvent.change(utrInput, { target: { value: '1234abc5678' } });
    expect(utrInput.value).toBe('12345678');

    fireEvent.click(screen.getByRole('button', { name: /VERIFY & COMPLETE/i }));
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Registration Recorded Successfully/i)).not.toBeInTheDocument();

    // Valid 12-digit numeric UTR succeeds
    fireEvent.change(utrInput, { target: { value: '432109876543' } });
    fireEvent.click(screen.getByRole('button', { name: /VERIFY & COMPLETE/i }));
    expect(screen.getByText(/Registration Recorded Successfully/i)).toBeInTheDocument();

    alertSpy.mockRestore();
  });

  test('AuthUI does not log form submissions to console', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    render(<AuthUI />);

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'TestPass123!' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));
    fireEvent.click(screen.getByRole('button', { name: /Continue with Google/i }));

    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  test('Security headers meta tags and GENERATE_SOURCEMAP=false are configured', () => {
    const indexHtml = fs.readFileSync(path.join(process.cwd(), 'public', 'index.html'), 'utf8');
    expect(indexHtml).toContain('http-equiv="X-Content-Type-Options" content="nosniff"');
    expect(indexHtml).toContain('http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin"');
    expect(indexHtml).toContain('http-equiv="Content-Security-Policy" content="frame-ancestors \'none\'"');

    const envProd = fs.readFileSync(path.join(process.cwd(), '.env.production'), 'utf8');
    expect(envProd).toContain('GENERATE_SOURCEMAP=false');
  });
});

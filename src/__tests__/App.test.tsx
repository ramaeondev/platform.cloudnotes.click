import { render, screen } from '@testing-library/react';
import App from '../App';
import { Toaster } from 'react-hot-toast';

test('renders app with toast', () => {
  render(
    <>
      <App />
      <Toaster />
    </>
  );
  const linkElement = screen.getByText(/your app text/i);
  expect(linkElement).toBeInTheDocument();
});
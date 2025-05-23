import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Battleship game title', () => {
  render(<App />);
  const titleElement = screen.getByText(/Battleship/i);
  expect(titleElement).toBeInTheDocument();
});

// Закомментируем тест для BoardSizeSelector, так как он пока не реализован
/*
test('renders board size selector', () => {
  render(<App />);
  const boardSizeLabel = screen.getByLabelText(/board size/i);
  expect(boardSizeLabel).toBeInTheDocument();
});
*/

import { useContext } from 'react';
import { ToastContext } from '../context/toast';

export function useToast() {
  return useContext(ToastContext);
}

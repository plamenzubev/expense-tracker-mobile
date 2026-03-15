import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'https://expense-tracker-api-w29w.onrender.com/api';

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — добавя access token
client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — рефрешва токена при 401
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        const response = await axios.post(`${API_URL}/token/refresh/`, {
          refresh: refreshToken,
        });

        const newAccessToken = response.data.access;
        await SecureStore.setItemAsync('access_token', newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        return client(originalRequest);
      } catch (e) {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
      }
    }

    return Promise.reject(error);
  }
);

export const login = async (username: string, password: string) => {
  const response = await client.post('/token/', { username, password });
  await SecureStore.setItemAsync('access_token', response.data.access);
  await SecureStore.setItemAsync('refresh_token', response.data.refresh);
  return response.data;
};

export const register = async (username: string, email: string, password: string) => {
  const response = await client.post('/users/register/', { username, email, password });
  return response.data;
};

export const getExpenses = async () => {
  const response = await client.get('/expenses/');
  return response.data;
};

export const createExpense = async (data: {
  title: string;
  amount: string;
  date: string;
  note?: string;
  category?: number;
}) => {
  const response = await client.post('/expenses/', data);
  return response.data;
};

export const deleteExpense = async (id: number) => {
  await client.delete(`/expenses/${id}/`);
};

export const getCategories = async () => {
  const response = await client.get('/categories/');
  return response.data;
};

export default client;
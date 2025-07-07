import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAuthStore = create((set) => ({
    user: null,
    token: null,
    isLoading: false,

    register: async (username, email, password, confirmPassword) => {

        set({ isLoading: true });

        if (password !== confirmPassword) {
        set({ isLoading: false });
        return {
            success: false,
            error: 'Passwords do not match'
        };
    } else {
        try {
            const response = await fetch('https://capstone-backend-deploy.onrender.com/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            await AsyncStorage.setItem('user', JSON.stringify(data.user));
            await AsyncStorage.setItem('token', data.token);

            set({token: data.token, user: data.user, isLoading: false});
            return {success: true};
        } catch (error) {
            set({ isLoading: false});
            return {
                success: false, error: error.message || 'An error occurred during registration'
            };
            
        }
    }
        
    },

    checkAuth: async () => {
        try {
            const userJson = await AsyncStorage.getItem('user');
            const token = await AsyncStorage.getItem('token');
            const user = userJson ? JSON.parse(userJson) : null;

            set({ user, token });
        } catch (error) {
            console.error("Error checking authentication:", error);
            return false;
        }
    },

    logout: async () => {
        await AsyncStorage.removeItem('user');
        await AsyncStorage.removeItem('token');
        set({ user: null, token: null });
    },

    sayHello: () => {
        console.log("uses authStore.js");
    }
}));
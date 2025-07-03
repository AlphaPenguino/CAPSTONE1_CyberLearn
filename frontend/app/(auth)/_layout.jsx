import { Stack } from 'expo-router';


export default function AuthLayout() {
  return  (
    <Stack screenOptions={{headerShown: true}} >
      
      <Stack.Screen name="index" options={{ title: "Login", headerShown: true }} />
    </Stack> 
  );
}
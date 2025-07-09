import { View, Text, TouchableOpacity } from 'react-native'
import { useEffect } from 'react'
import { useAuthStore } from '../../store/authStore';

export default function Home() {

  const { user, token, checkAuth, logout } = useAuthStore();
  const isAdmin = user?.privilege === 'admin';
  

  useEffect(() => { 
    checkAuth();
    console.log("Is Admin:", isAdmin);
  }, []);

  return (

    
    <View>
      <Text>home tab tonikaku yarushika naindayo
        hello {user?.username || 'Guest'}!
      </Text>
      
    </View>
  )
}
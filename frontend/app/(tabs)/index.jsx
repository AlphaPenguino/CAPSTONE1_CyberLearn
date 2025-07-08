import { View, Text, TouchableOpacity } from 'react-native'
import { useEffect } from 'react'
import { useAuthStore } from '../../store/authStore';

export default function Home() {

  const { user, token, checkAuth, logout } = useAuthStore();

  console.log("User:", user);
  console.log("Token:", token);

  useEffect(() => { 
    checkAuth();
  }, []);

  const handleLogout = async () => {
    logout();
  }

  return (

    
    <View>
      <Text>home tab 
        hello {user?.username || 'Guest'}!
      </Text>
      
    </View>
  )
}
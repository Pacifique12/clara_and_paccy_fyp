import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
  Alert,
  Keyboard,
  Image,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library'; 
import { collection, query, onSnapshot, addDoc, Timestamp, orderBy, where } from 'firebase/firestore';
import { db, auth, storage } from '@/services/config';
import { Ionicons } from '@expo/vector-icons';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';

interface Expert {
  id: string;
  name: string;
  expertise: string; 
  createdAt: Timestamp; 
}

interface Message {
  text?: string;
  imageUrl?: string;
  timestamp: Timestamp;
  sender: string;
}

const FarmerChatScreen = () => {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState<string>('');
  const [loadingMessages, setLoadingMessages] = useState<boolean>(true);
  const [showChat, setShowChat] = useState<boolean>(false);
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null);
  const [cropExpertise, setCropExpertise] = useState<string>(''); 
  const [image, setImage] = useState<string | null>(null);
  const user = auth.currentUser;
  const [chatId, setChatId] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    requestMediaLibraryPermission(); 
    fetchExperts();
  }, []);

  const requestMediaLibraryPermission = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Uruhushya Rurakenewe', 'Kugirango mubashe kubona amafoto murasabwa kwemeza uruhushya!');
    }
  };

  const fetchExperts = () => {
    const expertsQuery = query(collection(db, 'farmers'), where('role', '==', 'Expert'));
    const unsubscribe = onSnapshot(
      expertsQuery,
      (snapshot) => {
        const expertList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Expert[];
        setExperts(expertList);
      },
      (error) => {
        console.error('Error fetching experts:', error);
        Alert.alert('Error', 'Failed to load experts.');
      }
    );

    return () => unsubscribe();
  };

  const handleExpertSelect = (expert: Expert) => {
    if (!user) {
      Alert.alert('Ntabwo winjiye', 'Kugirango Ukoreshe Uruganiriro Urasabwa Kwinjira.');
      return;
    }

    const generatedChatId = generateChatId(user.uid, expert.id);
    setChatId(generatedChatId);
    setSelectedExpert(expert);
    setCropExpertise(expert.expertise || ''); 
    fetchMessages(generatedChatId);
    setShowChat(true);
  };

  const generateChatId = (uid1: string, uid2: string): string => {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
  };

  const fetchMessages = (chatId: string) => {
    setLoadingMessages(true);
    const messagesQuery = query(collection(db, `chats/${chatId}/messages`), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const messagesList = snapshot.docs.map((doc) => doc.data() as Message);
        setMessages(messagesList);
        setLoadingMessages(false);
      },
      (error) => {
        console.error('Error fetching messages:', error);
        setLoadingMessages(false);
        Alert.alert('Error', 'Failed to load messages.');
      }
    );

    return () => unsubscribe();
  };

  const sendMessage = async () => {
    if (!message && !image) {
      Alert.alert('Ntabutumwa', 'Mwandike Ubutumwa Mushaka Kohereza.');
      return;
    }

    if (!chatId || !user) {
      Alert.alert('Ntawokuganira Nawe Wahisemo', 'Muhitemo Umujyanama Muganira.');
      return;
    }

    setSendingMessage(true);

    try {
      const messageData: Message = {
        text: message.trim() || undefined,
        timestamp: Timestamp.now(),
        sender: user.uid,
      };

      if (image) {
        const imageUrl = await uploadImage(image);
        messageData.imageUrl = imageUrl;
      }

      await addDoc(collection(db, `chats/${chatId}/messages`), messageData);
      setMessage('');
      setImage(null);
      Keyboard.dismiss();
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Kohereza Ubutumwa Byanze Ongera Ugerageze.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled && result.assets) {
      setImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    const blob = await fetch(uri).then((response) => response.blob());
    const storageRef = ref(storage, `images/${Date.now()}_${user?.uid}.jpg`);
    const uploadTask = uploadBytesResumable(storageRef, blob);

    return new Promise<string>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        () => {},
        (error) => {
          console.error('Image upload failed:', error);
          reject('Kwinjiza Ifoto Byanze ongera Ugerageze.');
        },
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        }
      );
    });
  };

  const handleImagePress = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setModalVisible(true);
  };

  const renderMessagesList = () => (
    <FlatList
      data={messages}
      keyExtractor={(item, index) => index.toString()}
      renderItem={({ item }) => (
        <View style={[styles.messageCard, item.sender === user?.uid ? styles.userMessage : styles.otherMessage]}>
          {item.text && <Text style={styles.messageText}>{item.text}</Text>}
          {item.imageUrl && (
            <TouchableOpacity onPress={() => handleImagePress(item.imageUrl)}>
              <Image source={{ uri: item.imageUrl }} style={styles.imageMessage} />
            </TouchableOpacity>
          )}
          <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
        </View>
      )}
      style={styles.messagesList}
      contentContainerStyle={styles.messagesContainer}
    />
  );

  const formatTimestamp = (timestamp: Timestamp): string => {
    const date = timestamp.toDate();
    return date.toLocaleString();
  };

  return (
    <SafeAreaView style={styles.container}>
      {showChat ? (
        <>
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setShowChat(false)} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="green" />
            </TouchableOpacity>
            <Text style={styles.expertName}>
              Chat with {selectedExpert?.name}
            </Text>
          </View>

          {loadingMessages ? <ActivityIndicator size="large" color="green" /> : renderMessagesList()}

          <View style={styles.inputContainer}>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Andika Ubutumwa hano"
              style={styles.messageInput}
            />
            <TouchableOpacity onPress={handleImagePick} style={styles.imagePickerButton}>
              <Ionicons name="image" size={24} color="green" />
            </TouchableOpacity>
            <TouchableOpacity onPress={sendMessage} style={styles.sendButton} disabled={sendingMessage}>
              {image && <Image source={{ uri: image }} style={styles.previewImage} />}
              <Ionicons name="send" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <Modal visible={modalVisible} transparent={true}>
            <View style={styles.modalContainer}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeModalButton}>
                <Ionicons name="close" size={30} color="white" />
              </TouchableOpacity>
              <Image source={{ uri: selectedImage }} style={styles.fullScreenImage} />
            </View>
          </Modal>
        </>
      ) : (
        <>
          <Text style={styles.selectExpertText}>Hitamo umujyanama Muganira:</Text>
          <FlatList
            data={experts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.expertCard} onPress={() => handleExpertSelect(item)}>
                <Text style={styles.expertName}>{item.name}</Text>
                <Text style={styles.expertiseText}>Umujyanama: {item.cropExpertise}</Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.expertsList}
          />
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 16,
  },
  selectExpertText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'green',
    marginVertical: 20,
    textAlign: 'center',
  },
  expertCard: {
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
    borderColor: '#ddd',
    borderWidth: 1,
  },
  expertName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  expertiseText: {
    fontSize: 14,
    color: '#555',
    marginTop: 4,
  },
  expertsList: {
    paddingBottom: 16,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  backButton: {
    marginRight: 10,
  },
  messageCard: {
    padding: 10,
    borderRadius: 8,
    marginVertical: 5,
    maxWidth: '75%',
  },
  userMessage: {
    backgroundColor: '#dff7e1',
    alignSelf: 'flex-end',
  },
  otherMessage: {
    backgroundColor: '#e5e5ea',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#f1f1f1',
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
    borderColor: '#ddd',
    borderWidth: 1,
  },
  imagePickerButton: {
    paddingHorizontal: 8,
  },
  sendButton: {
    backgroundColor: 'green',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageMessage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginTop: 10,
  },
  previewImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '90%',
    height: '70%',
  },
  closeModalButton: {
    position: 'absolute',
    top: 40,
    right: 20,
  },
});

export default FarmerChatScreen;

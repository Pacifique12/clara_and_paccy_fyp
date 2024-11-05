import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage
import { db } from "@/services/config"; // Import Firebase config
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import * as Linking from 'expo-linking';

// Interface for PDF file type
interface PdfFile {
  id: string;
  name: string;
  url: string;
  uploaderId: string;
  createdAt: string;
  title: string;
  description: string;
}

const PdfScreen = () => {
  const [pdfFiles, setPdfFiles] = useState<PdfFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAndSavePdfFiles = async () => {
      const localFiles = await getLocalFiles();
      if (localFiles.length > 0) {
        setPdfFiles(localFiles);
      }
      await fetchPdfFiles();
    };

    fetchAndSavePdfFiles();
  }, []);

  // Function to fetch PDF files from Firestore and save them to local storage
  const fetchPdfFiles = async () => {
    try {
      const q = query(collection(db, 'pdfFiles'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const files: PdfFile[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as PdfFile));

      setPdfFiles(files); // Update state with fetched files
      await saveFilesToLocal(files); // Save files to local storage
    } catch (error) {
      console.error("Error fetching PDF files:", error);
      Alert.alert("Error", "Unable to fetch PDF files. Please check your permissions.");
    } finally {
      setLoading(false);
    }
  };

  // Function to save files to local storage
  const saveFilesToLocal = async (files: PdfFile[]) => {
    try {
      await AsyncStorage.setItem('pdfFiles', JSON.stringify(files));
    } catch (error) {
      console.error("Error saving files to local storage:", error);
    }
  };

  // Function to get files from local storage
  const getLocalFiles = async (): Promise<PdfFile[]> => {
    try {
      const filesString = await AsyncStorage.getItem('pdfFiles');
      return filesString ? JSON.parse(filesString) : [];
    } catch (error) {
      console.error("Error getting files from local storage:", error);
      return [];
    }
  };

  // Function to open PDF URL
  const openPdf = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error("Error opening PDF:", error);
      Alert.alert('Error', 'Could not open the PDF file.');
    }
  };

  // Render function for each PDF item
  const renderPdfItem = ({ item }: { item: PdfFile }) => (
    <TouchableOpacity style={styles.pdfItem} onPress={() => openPdf(item.url)}>
      <Text style={styles.pdfTitle}>{item.title}</Text>
      <Text style={styles.pdfDescription}>{item.description}</Text>
      <Text style={styles.uploadDate}>
        Uploaded: {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Ibitabo Bifasha Kwihugura Mubuhinzi bugezweho haba Ibirayi Cg Ibigori
      </Text>
      {loading ? (
        <Text style={styles.loadingText}>Loading PDF files...</Text>
      ) : (
        <FlatList
          data={pdfFiles}
          renderItem={renderPdfItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
        />
      )}
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f8f8',
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  pdfItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    backgroundColor: '#fff',
    borderRadius: 5,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  pdfTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007BFF',
  },
  pdfDescription: {
    fontSize: 14,
    color: '#555',
    marginVertical: 5,
  },
  uploadDate: {
    fontSize: 12,
    color: '#999',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#999',
  },
});

export default PdfScreen;

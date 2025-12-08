import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { ChatConversation, UserProfile, Role } from '../../types';
import LoadingSpinner from '../../components/utils/LoadingSpinner';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';
import { getOrCreateChat } from '../../services/chatService';
import { Search, MessageSquare } from 'lucide-react';
import firebase from 'firebase/compat/app';

const ChatPage: React.FC = () => {
  const { chatId } = useParams<{ chatId?: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!userProfile) return;

    setLoading(true);
    const unsubscribe = db.collection('chats')
      .where('participants', 'array-contains', userProfile.id)
      .onSnapshot(snapshot => {
        const convos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatConversation));
        // Sort client-side to avoid composite index requirement
        convos.sort((a, b) => {
            const timeA = a.lastMessage?.timestamp?.toDate ? a.lastMessage.timestamp.toDate().getTime() : 0;
            const timeB = b.lastMessage?.timestamp?.toDate ? b.lastMessage.timestamp.toDate().getTime() : 0;
            return timeB - timeA;
        });
        setConversations(convos);
        setLoading(false);
      }, error => {
        console.error("Error fetching conversations:", error);
        setLoading(false);
      });

    return () => unsubscribe();
  }, [userProfile]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
        setSearchResults([]);
        return;
    }
    try {
        const usersRef = db.collection('users');
        const lowercasedQuery = query.toLowerCase();

        // Name/Surname search
        const capitalizedQuery = query.charAt(0).toUpperCase() + query.slice(1);
        const nameQueryPromise = usersRef.where('name', '>=', capitalizedQuery).where('name', '<=', capitalizedQuery + '\uf8ff').limit(5).get();
        const surnameQueryPromise = usersRef.where('surname', '>=', capitalizedQuery).where('surname', '<=', capitalizedQuery + '\uf8ff').limit(5).get();
        
        // Role search
        const matchingRoles = Object.values(Role).filter(role => role.toLowerCase().includes(lowercasedQuery));
        const roleQueryPromises = matchingRoles.map(role => usersRef.where('role', '==', role).limit(5).get());

        const [nameSnapshot, surnameSnapshot, ...roleSnapshots] = await Promise.all([
            nameQueryPromise,
            surnameQueryPromise,
            ...roleQueryPromises,
        ]);

        const resultsMap = new Map<string, UserProfile>();

        const processSnapshot = (snapshot: firebase.firestore.QuerySnapshot) => {
            snapshot.docs.forEach(doc => {
                if (doc.id !== userProfile?.id) { // Exclude self
                    resultsMap.set(doc.id, { id: doc.id, ...doc.data() } as UserProfile);
                }
            });
        };

        processSnapshot(nameSnapshot);
        processSnapshot(surnameSnapshot);
        roleSnapshots.forEach(processSnapshot);
        
        setSearchResults(Array.from(resultsMap.values()));
    } catch(error) {
        console.error("Error searching for users to chat:", error);
    }
  }

  const handleSelectUser = async (user: UserProfile) => {
      if (!userProfile) return;
      const newChatId = await getOrCreateChat(userProfile.id, user.id);
      setSearchQuery('');
      setSearchResults([]);
      setIsSearching(false);
      navigate(`/messages/${newChatId}`);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="bg-[#161B22] border border-gray-700 rounded-lg shadow-md overflow-hidden">
      <div className={`chat-container ${chatId ? 'view-chat' : ''}`}>
        <div className="conversation-list flex flex-col">
           <div className="p-4 border-b border-gray-700">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name or role"
                        className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        onFocus={() => setIsSearching(true)}
                    />
                     {isSearching && (
                         <div className="absolute z-20 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                            {searchResults.length > 0 ? (
                                searchResults.map(user => (
                                    <div key={user.id} onClick={() => handleSelectUser(user)} className="cursor-pointer p-3 hover:bg-sky-700 text-white">
                                        <p className="font-semibold">{user.name} {user.surname}</p>
                                        <p className="text-xs text-gray-400">{user.role}</p>
                                    </div>
                                ))
                            ) : (
                                searchQuery.length > 1 && <p className="p-3 text-sm text-gray-500">No users found.</p>
                            )}
                             <button onClick={() => { setIsSearching(false); setSearchQuery(''); setSearchResults([]); }} className="w-full text-center p-2 text-xs text-gray-400 hover:bg-gray-700">Close</button>
                        </div>
                    )}
                </div>
           </div>
           <ConversationList
            conversations={conversations}
            activeChatId={chatId}
            onSelectConversation={(id) => navigate(`/messages/${id}`)}
          />
        </div>
        <div className="chat-window">
          {chatId ? (
            <ChatWindow key={chatId} chatId={chatId} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 h-full">
                <MessageSquare size={64} className="mb-4 opacity-50"/>
                <h2 className="text-xl font-semibold">Select a conversation</h2>
                <p>or search for a user to start chatting.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
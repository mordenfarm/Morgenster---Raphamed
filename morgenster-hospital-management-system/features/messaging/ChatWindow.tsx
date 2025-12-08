import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { ChatMessage, ChatConversation, Role, UserProfile } from '../../types';
import MessageInput from './MessageInput';
import { User, ArrowLeft, CheckCheck } from 'lucide-react';

interface ChatWindowProps {
  chatId: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chatId }) => {
  const { userProfile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [otherUser, setOtherUser] = useState<{name: string, role?: Role} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isUpdatingReadStatus = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!chatId || !userProfile) return;

    const chatRef = db.collection('chats').doc(chatId);

    const unsubscribeConvo = chatRef.onSnapshot(doc => {
      if (doc.exists) {
        const data = doc.data() as ChatConversation;
        setConversation(data);

        // Mark conversation unread count as read
        if (data.unreadCounts && data.unreadCounts[userProfile.id] > 0) {
            chatRef.update({
                [`unreadCounts.${userProfile.id}`]: 0
            });
        }
        
        // Get other user's info
        const otherUserId = data.participants.find((p: string) => p !== userProfile.id);
        if (otherUserId) {
            const profileFromChat = data.participantProfiles[otherUserId];
            setOtherUser({
                name: `${profileFromChat.name} ${profileFromChat.surname}`,
                role: profileFromChat.role,
            });
        }
      }
    });

    const unsubscribeMessages = chatRef.collection('messages')
      .orderBy('timestamp', 'asc')
      .onSnapshot(snapshot => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
        setMessages(msgs);
      });

    return () => {
      unsubscribeConvo();
      unsubscribeMessages();
    };
  }, [chatId, userProfile]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!chatId || !userProfile || messages.length === 0 || isUpdatingReadStatus.current) {
        return;
    }

    const unreadMessagesToUpdate = messages.filter(
        msg => !msg.read && msg.senderId !== userProfile.id
    );

    if (unreadMessagesToUpdate.length > 0) {
        isUpdatingReadStatus.current = true;
        const batch = db.batch();
        unreadMessagesToUpdate.forEach(msg => {
            const msgRef = db.collection('chats').doc(chatId).collection('messages').doc(msg.id);
            batch.update(msgRef, { read: true });
        });

        // If the last message in the conversation is being marked as read, update the conversation doc too
        const lastMessageInChat = messages[messages.length - 1];
        if (conversation?.lastMessage && 
            conversation.lastMessage.senderId !== userProfile.id && 
            !conversation.lastMessage.read &&
            unreadMessagesToUpdate.some(msg => msg.id === lastMessageInChat.id)) 
        {
            const chatRef = db.collection('chats').doc(chatId);
            batch.update(chatRef, { 'lastMessage.read': true });
        }

        batch.commit()
            .catch(err => {
                console.error("Failed to mark messages as read:", err);
            })
            .finally(() => {
                isUpdatingReadStatus.current = false;
            });
    }
  }, [chatId, userProfile, messages, conversation]);

  if (!userProfile) return null;

  return (
    <>
      <div className="p-4 border-b border-gray-700 flex items-center gap-3">
        <button 
            onClick={() => navigate('/messages')} 
            className="p-2 -ml-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 lg:hidden"
            aria-label="Back to conversations"
        >
            <ArrowLeft size={20} />
        </button>
        <div className="flex-shrink-0">
          <User size={20} className="text-gray-400"/>
        </div>
        <div className="truncate">
          <h2 className="text-lg font-semibold text-white truncate">{otherUser?.name || 'Loading...'}</h2>
          {otherUser?.role && <p className="text-xs text-gray-400 -mt-1 truncate">{otherUser.role}</p>}
        </div>
      </div>
      <div className="chat-messages p-4">
        {/* The order is bottom-to-top due to flex-direction: column in CSS for the parent */}
        {messages.map(msg => (
          <div key={msg.id} className={`message-bubble ${msg.senderId === userProfile.id ? 'sent' : 'received'}`}>
            <p>{msg.text}</p>
            {msg.attachment && (
              <div className="mt-2 p-2 bg-black/20 rounded-md text-xs">
                File: {msg.attachment.name} (upload disabled)
              </div>
            )}
            <div className="message-meta">
                <span className="message-timestamp">
                    {msg.timestamp?.toDate ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'}) : '...'}
                </span>
                {msg.senderId === userProfile.id && (
                    <span className={`message-ticks ${msg.read ? 'read' : ''}`} title={msg.read ? 'Read' : 'Delivered'}>
                        <CheckCheck size={16} />
                    </span>
                )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <MessageInput chatId={chatId} />
    </>
  );
};

export default ChatWindow;
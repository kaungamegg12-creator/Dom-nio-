/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Hash, Plus, LogIn, LogOut, Image as ImageIcon, Send, Menu, X, Smile, Trash2, Edit2, Highlighter, CornerDownLeft, Palette, User, Settings as SettingsIcon, Type as TypeIcon, Bold, Italic, ShieldCheck, ShieldAlert, Lock, BarChart2, Clock } from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  setDoc,
  deleteDoc,
  doc, 
  query, 
  orderBy, 
  serverTimestamp, 
  updateDoc, 
  arrayUnion,
  arrayRemove,
  getDoc,
  getDocFromServer
} from 'firebase/firestore';
import { db } from './firebase';

type Reaction = '✅' | '❌' | '😄' | '😍' | '😭' | '😡';

type Message = {
  id: string;
  channelId: string;
  author: string;
  content: string;
  imageUrl?: string;
  imageLayout?: 'normal' | 'full' | 'center';
  color?: string;
  authorColor?: string;
  authorFont?: string;
  authorBold?: boolean;
  authorItalic?: boolean;
  timestamp: number;
  reactions: Record<Reaction, string[]>; // Array of user IDs
  poll?: {
    question: string;
    options: string[];
    votes: Record<string, number>; // userId -> optionIndex
  };
};

type Channel = {
  id: string;
  name: string;
  color?: string;
};

type UserProfile = {
  userId: string;
  nameColor: string;
  fontFamily: string;
  isBold: boolean;
  isItalic: boolean;
};

const ADMINS: Record<string, string> = {
  'VIANATV': '@12345678910V',
  'LELO': '@12345678910L',
  'DAN': '@12345678910D'
};

const AVAILABLE_REACTIONS: Reaction[] = ['✅', '❌', '😄', '😍', '😭', '😡'];

const FONTS = [
  { name: 'Padrão', value: 'inherit' },
  { name: 'Serif', value: 'serif' },
  { name: 'Monospace', value: 'monospace' },
  { name: 'Cursive', value: 'cursive' },
  { name: 'Fantasy', value: 'fantasy' },
  { name: 'System', value: 'system-ui' },
];

const COLORS = [
  { name: 'Padrão', value: '' },
  { name: 'Vermelho', value: '#ff4444' },
  { name: 'Verde', value: '#00c851' },
  { name: 'Azul', value: '#33b5e5' },
  { name: 'Amarelo', value: '#ffbb33' },
  { name: 'Roxo', value: '#aa66cc' },
  { name: 'Rosa', value: '#ff4081' },
  { name: 'Laranja', value: '#ff8800' },
  { name: 'Ciano', value: '#00e5ff' },
  { name: 'Ouro', value: '#ffd700' },
];

const ProfileModal = ({ 
  profile, 
  onSave, 
  onClose 
}: { 
  profile: UserProfile | null, 
  onSave: (p: Partial<UserProfile>) => void, 
  onClose: () => void 
}) => {
  const [nameColor, setNameColor] = useState(profile?.nameColor || '');
  const [fontFamily, setFontFamily] = useState(profile?.fontFamily || 'inherit');
  const [isBold, setIsBold] = useState(profile?.isBold || false);
  const [isItalic, setIsItalic] = useState(profile?.isItalic || false);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#313338] w-full max-w-md rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-[#1e1f22] flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <User size={24} className="text-indigo-400" />
            Personalizar Perfil (Admin)
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Preview */}
          <div className="bg-[#2b2d31] p-4 rounded-lg">
            <span className="text-xs font-bold text-gray-400 uppercase block mb-2">Pré-visualização</span>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">A</div>
              <span 
                className="text-lg"
                style={{ 
                  color: nameColor || '#818cf8', 
                  fontFamily: fontFamily,
                  fontWeight: isBold ? 'bold' : 'normal',
                  fontStyle: isItalic ? 'italic' : 'normal'
                }}
              >
                Postado por: Administrador
              </span>
            </div>
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
              <Palette size={14} /> Cor do Nome
            </label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setNameColor(c.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${nameColor === c.value ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c.value || '#383a40' }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Font Picker */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
              <TypeIcon size={14} /> Fonte do Nome
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FONTS.map((f) => (
                <button
                  key={f.name}
                  onClick={() => setFontFamily(f.value)}
                  className={`px-3 py-2 rounded text-xs transition-all border ${fontFamily === f.value ? 'bg-indigo-500 text-white border-indigo-400' : 'bg-[#383a40] text-gray-300 border-transparent hover:bg-[#404249]'}`}
                  style={{ fontFamily: f.value }}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          {/* Style Toggles */}
          <div className="flex gap-4">
            <button
              onClick={() => setIsBold(!isBold)}
              className={`flex-1 py-2 rounded flex items-center justify-center gap-2 transition-all border ${isBold ? 'bg-indigo-500 text-white border-indigo-400' : 'bg-[#383a40] text-gray-300 border-transparent hover:bg-[#404249]'}`}
            >
              <Bold size={16} /> Negrito
            </button>
            <button
              onClick={() => setIsItalic(!isItalic)}
              className={`flex-1 py-2 rounded flex items-center justify-center gap-2 transition-all border ${isItalic ? 'bg-indigo-500 text-white border-indigo-400' : 'bg-[#383a40] text-gray-300 border-transparent hover:bg-[#404249]'}`}
            >
              <Italic size={16} /> Itálico
            </button>
          </div>
        </div>

        <div className="p-4 bg-[#2b2d31] flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-white hover:underline transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={() => onSave({ nameColor, fontFamily, isBold, isItalic })}
            className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded transition-all"
          >
            Salvar Perfil
          </button>
        </div>
      </div>
    </div>
  );
};

const MessageInput = ({ onSend, onPoll, channelName, isAdmin }: { onSend: (content: string, imageUrl?: string, imageLayout?: 'normal' | 'full' | 'center', color?: string, authorColor?: string) => void, onPoll: () => void, channelName: string, isAdmin: boolean }) => {
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageLayout, setImageLayout] = useState<'normal' | 'full' | 'center'>('normal');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedAuthorColor, setSelectedAuthorColor] = useState<string>('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [activePicker, setActivePicker] = useState<'text' | 'author'>('text');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const colors = [
    { name: 'Padrão', value: '' },
    { name: 'Vermelho', value: '#ff4444' },
    { name: 'Verde', value: '#00c851' },
    { name: 'Azul', value: '#33b5e5' },
    { name: 'Amarelo', value: '#ffbb33' },
    { name: 'Roxo', value: '#aa66cc' },
    { name: 'Rosa', value: '#ff4081' },
    { name: 'Laranja', value: '#ff8800' },
    { name: 'Ciano', value: '#00e5ff' },
    { name: 'Ouro', value: '#ffd700' },
  ];

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (content.trim() || imageUrl.trim()) {
      onSend(content, imageUrl, imageLayout, selectedColor, selectedAuthorColor);
      setContent('');
      setImageUrl('');
      setImageLayout('normal');
      setSelectedColor('');
      setSelectedAuthorColor('');
      setShowImageInput(false);
      setShowColorPicker(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleHighlight = () => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart || 0;
    const end = textareaRef.current.selectionEnd || 0;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + `==${selectedText}==` + content.substring(end);
    setContent(newText);
    // Focus back and set cursor position
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(start + 2, end + 2);
    }, 0);
  };

  const handleNewLine = () => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart || 0;
    const end = textareaRef.current.selectionEnd || 0;
    const newText = content.substring(0, start) + '\n' + content.substring(end);
    setContent(newText);
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(start + 1, start + 1);
      // Trigger height adjustment
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }, 0);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-[#313338] shrink-0">
      {showColorPicker && isAdmin && (
        <div className="mb-2 p-3 bg-[#2b2d31] rounded-md">
          <div className="flex flex-col gap-3">
            <div className="flex gap-4 border-b border-[#383a40] pb-2">
              <button 
                type="button" 
                onClick={() => setActivePicker('text')}
                className={`text-xs font-bold uppercase transition-colors ${activePicker === 'text' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Cor do Texto
              </button>
              <button 
                type="button" 
                onClick={() => setActivePicker('author')}
                className={`text-xs font-bold uppercase transition-colors ${activePicker === 'author' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Cor do Nome
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => activePicker === 'text' ? setSelectedColor(c.value) : setSelectedAuthorColor(c.value)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all border ${
                    (activePicker === 'text' ? selectedColor === c.value : selectedAuthorColor === c.value)
                      ? 'border-white scale-110' 
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.value || '#383a40', color: c.value ? 'white' : '#949ba4' }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {showImageInput && (
        <div className="mb-2 p-3 bg-[#2b2d31] rounded-md space-y-3">
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              placeholder="Cole a URL da imagem aqui" 
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="flex-1 bg-[#1e1f22] p-2 rounded text-gray-200 outline-none text-sm"
            />
            <button type="button" onClick={() => { setImageUrl(''); setShowImageInput(false); }} className="text-gray-400 hover:text-white">
              <X size={16} />
            </button>
          </div>
          
          {isAdmin && imageUrl && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase">Layout da Imagem (Admin)</span>
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => setImageLayout('normal')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${imageLayout === 'normal' ? 'bg-indigo-500 text-white' : 'bg-[#383a40] text-gray-400 hover:bg-[#404249]'}`}
                >
                  Normal
                </button>
                <button 
                  type="button"
                  onClick={() => setImageLayout('center')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${imageLayout === 'center' ? 'bg-indigo-500 text-white' : 'bg-[#383a40] text-gray-400 hover:bg-[#404249]'}`}
                >
                  Centralizado
                </button>
                <button 
                  type="button"
                  onClick={() => setImageLayout('full')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${imageLayout === 'full' ? 'bg-indigo-500 text-white' : 'bg-[#383a40] text-gray-400 hover:bg-[#404249]'}`}
                >
                  Largura Total
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="flex items-end bg-[#383a40] rounded-lg p-2 gap-2">
        <div className="mb-1">
          <button 
            type="button" 
            onClick={() => setShowImageInput(!showImageInput)}
            className="text-gray-400 hover:text-gray-200 p-2 rounded-full hover:bg-[#404249] transition-colors"
            title="Adicionar Imagem por URL"
          >
            <ImageIcon size={20} />
          </button>
        </div>
        
        <textarea
          ref={textareaRef}
          rows={1}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Conversar em #${channelName}`}
          className="flex-1 bg-transparent text-gray-200 outline-none placeholder-gray-500 py-2 resize-none max-h-40 overflow-y-auto custom-scrollbar"
          style={{ height: 'auto' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = `${target.scrollHeight}px`;
          }}
        />

        <div className="flex items-center gap-1 mb-1">
          {isAdmin && (
            <>
              <button 
                type="button" 
                onClick={() => setShowColorPicker(!showColorPicker)}
                className={`p-2 rounded-full hover:bg-[#404249] transition-colors ${showColorPicker ? 'text-indigo-400' : 'text-gray-400 hover:text-indigo-400'}`}
                title="Escolher Cor do Texto"
              >
                <Palette size={20} />
              </button>
              <button 
                type="button" 
                onClick={handleNewLine}
                className="text-gray-400 hover:text-indigo-400 p-2 rounded-full hover:bg-[#404249] transition-colors"
                title="Pular Linha (Shift+Enter)"
              >
                <CornerDownLeft size={20} />
              </button>
            </>
          )}
          <button 
            type="button" 
            onClick={handleHighlight}
            className="text-gray-400 hover:text-yellow-400 p-2 rounded-full hover:bg-[#404249] transition-colors"
            title="Destacar Texto (==texto==)"
          >
            <Highlighter size={20} />
          </button>
          <button 
            type="button" 
            onClick={onPoll}
            className="text-gray-400 hover:text-green-400 p-2 rounded-full hover:bg-[#404249] transition-colors"
            title="Criar Enquete"
          >
            <BarChart2 size={20} />
          </button>
          <button 
            type="submit"
            disabled={!content.trim() && !imageUrl.trim()}
            className="text-indigo-400 hover:text-indigo-300 disabled:text-gray-600 p-2 rounded-full hover:bg-[#404249] transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </form>
  );
};

const renderContent = (content: string, color?: string) => {
  if (!content) return null;
  
  // Simple highlight parser for ==text==
  const parts = content.split(/(==.*?==)/g);
  
  return (
    <p className="mt-1 whitespace-pre-wrap break-words" style={{ color: color || '#dbdee1' }}>
      {parts.map((part, i) => {
        if (part.startsWith('==') && part.endsWith('==')) {
          return (
            <mark key={i} className="bg-yellow-500/30 text-yellow-200 rounded px-1 border border-yellow-500/20 font-medium">
              {part.slice(2, -2)}
            </mark>
          );
        }
        return part;
      })}
    </p>
  );
};

const MessageItem: React.FC<{ 
  message: Message, 
  onReact: (id: string, r: Reaction) => any,
  onDelete: (id: string) => void,
  onVote: (id: string, index: number) => void,
  isAdmin: boolean,
  currentUserId: string,
  presenceMap: Record<string, string>
}> = ({ message, onReact, onDelete, onVote, isAdmin, currentUserId, presenceMap }) => {
  const [showReactions, setShowReactions] = useState(false);

  const totalVotes = message.poll ? Object.keys(message.poll.votes || {}).length : 0;
  const userVote = message.poll?.votes?.[currentUserId];
  const isExpired = message.poll?.expiresAt ? Date.now() > message.poll.expiresAt : false;

  return (
    <div className="group flex gap-4 px-4 py-2 hover:bg-[#2e3035] transition-colors relative mt-4 rounded-md">
      <div className="w-10 h-10 rounded-full bg-indigo-500 shrink-0 flex items-center justify-center text-white font-bold text-lg mt-1">
        {message.author.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span 
            className="font-medium" 
            style={{ 
              color: message.authorColor || (message.authorUID?.startsWith('user_') ? '#10b981' : '#818cf8'),
              fontFamily: message.authorFont || 'inherit',
              fontWeight: message.authorBold ? 'bold' : 'normal',
              fontStyle: message.authorItalic ? 'italic' : 'normal'
            }}
          >
            Postado por: {message.author}
          </span>
          <span className="text-xs text-gray-400">
            {new Date(message.timestamp).toLocaleString('pt-BR')}
          </span>
        </div>
        {renderContent(message.content, message.color)}
        
        {message.poll && (
          <div className="mt-4 bg-[#2b2d31] rounded-lg p-4 border border-[#1e1f22] max-w-md">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
              <BarChart2 size={18} className={isExpired ? "text-gray-500" : "text-indigo-400"} />
              {message.poll.question}
              {isExpired && (
                <span className="ml-auto text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full uppercase tracking-widest font-black">
                  Encerrada
                </span>
              )}
            </h3>
            <div className="space-y-3">
              {message.poll.options.map((option, index) => {
                const optionVotes = Object.values(message.poll?.votes || {}).filter(v => v === index).length;
                const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
                const isSelected = userVote === index;

                return (
                  <button
                    key={index}
                    onClick={() => !isExpired && onVote(message.id, index)}
                    disabled={isExpired}
                    className={`w-full text-left relative overflow-hidden rounded-md border transition-all ${
                      isSelected 
                        ? 'bg-indigo-500/20 border-indigo-500' 
                        : isExpired
                          ? 'bg-[#232428] border-transparent cursor-default'
                          : 'bg-[#313338] border-[#1e1f22] hover:border-gray-600'
                    }`}
                  >
                    <div 
                      className={`absolute inset-y-0 left-0 transition-all duration-500 ${isExpired ? 'bg-gray-500/10' : 'bg-indigo-500/10'}`} 
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="relative p-3 flex justify-between items-center z-10">
                      <span className={`text-sm font-medium ${isSelected ? (isExpired ? 'text-gray-400' : 'text-indigo-300') : 'text-gray-300'}`}>
                        {option}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        {percentage}% ({optionVotes})
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex justify-between items-center">
              <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                Total de votos: {totalVotes}
              </div>
              {message.poll.expiresAt && !isExpired && (
                <div className="text-[10px] text-indigo-400/60 uppercase font-bold tracking-wider flex items-center gap-1">
                  <Clock size={10} />
                  Expira em: {new Date(message.poll.expiresAt).toLocaleString('pt-BR')}
                </div>
              )}
            </div>
          </div>
        )}

        {message.imageUrl && (
          <div className={`mt-3 flex ${message.imageLayout === 'center' ? 'justify-center' : ''}`}>
            <img 
              src={message.imageUrl} 
              alt="Anexo" 
              className={`rounded-lg object-contain bg-[#2b2d31] ${
                message.imageLayout === 'full' 
                  ? 'w-full max-h-[80vh]' 
                  : 'max-w-full sm:max-w-md max-h-96'
              }`}
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          </div>
        )}
        
        {/* Reactions Display */}
        <div className="flex flex-wrap gap-1 mt-2">
          {message.reactions && Object.entries(message.reactions).map(([emoji, users]) => {
            const userList = Array.isArray(users) ? users : [];
            const hasReacted = userList.includes(currentUserId);
            const userNames = userList.map(uid => presenceMap[uid] || 'Desconhecido').join(', ');

            return userList.length > 0 && (
              <button 
                key={emoji}
                onClick={() => onReact(message.id, emoji as Reaction)}
                title={`Reagido por: ${userNames}`}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-sm transition-colors border group/reaction relative ${
                  hasReacted 
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' 
                    : 'bg-[#2b2d31] hover:bg-[#383a40] border-transparent hover:border-gray-600 text-gray-400'
                }`}
              >
                <span>{emoji}</span>
                <span className="font-medium">{userList.length}</span>
                
                {/* Tooltip for reactions */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/reaction:block z-50">
                  <div className="bg-black text-white text-[10px] px-2 py-1 rounded whitespace-nowrap shadow-xl border border-gray-800">
                    {userNames}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions (shows on hover on desktop, always visible on mobile) */}
      <div className="absolute right-4 -top-4 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-[#313338] border border-[#1e1f22] rounded-md shadow-lg flex items-center z-20">
        <div className="relative flex">
          <button 
            onClick={() => setShowReactions(!showReactions)}
            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-[#404249] rounded-l-md"
            title="Adicionar Reação"
          >
            <Smile size={18} />
          </button>
          {isAdmin && (
            <button 
              onClick={() => onDelete(message.id)}
              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-[#404249] border-l border-[#1e1f22] rounded-r-md"
              title="Apagar Mensagem"
            >
              <Trash2 size={18} />
            </button>
          )}
          {showReactions && (
            <div className="absolute right-0 top-full mt-1 bg-[#2b2d31] border border-[#1e1f22] rounded-lg shadow-2xl p-2 flex gap-1 z-50 animate-in fade-in zoom-in-95 duration-100">
              {AVAILABLE_REACTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => {
                    onReact(message.id, emoji);
                    setShowReactions(false);
                  }}
                  className="p-2 hover:bg-[#404249] rounded-md text-xl transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: undefined, // We are using custom auth, so this is not applicable for Firebase Auth
      email: undefined,
      emailVerified: undefined,
      isAnonymous: undefined,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
};

export default function App() {
  const [userId] = useState(() => {
    let id = localStorage.getItem('discord_user_id');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('discord_user_id', id);
    }
    return id;
  });

  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return localStorage.getItem('discord_user');
  });
  const [guestNick, setGuestNick] = useState<string | null>(() => {
    return localStorage.getItem('cursed_isle_nick');
  });
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<number>(0);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [showRenameChannelModal, setShowRenameChannelModal] = useState(false);
  const [channelToRename, setChannelToRename] = useState<Channel | null>(null);
  const [showEditServerNameModal, setShowEditServerNameModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<{ type: 'channel' | 'message', id: string } | null>(null);
  const [serverName, setServerName] = useState('🦖 Domínio dos Dinossauros');
  const [newServerName, setNewServerName] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelColor, setNewChannelColor] = useState('');
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState('');
  const [renameChannelName, setRenameChannelName] = useState('');
  const [renameChannelColor, setRenameChannelColor] = useState('');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showSecurityMessage, setShowSecurityMessage] = useState(false);
  const [securityStatus, setSecurityStatus] = useState<'secure' | 'checking'>('checking');
  const [presenceMap, setPresenceMap] = useState<Record<string, string>>({});

  const isAdmin = !!currentUser;

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Test connection
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
    setIsAuthReady(true);
    
    // Check for guest nick
    if (!localStorage.getItem('cursed_isle_nick') && !localStorage.getItem('discord_user')) {
      setShowGuestModal(true);
    }

    // Show security message on entry
    setShowSecurityMessage(true);
    setTimeout(() => {
      setSecurityStatus('secure');
    }, 1500);
    
    // Auto-hide security message after 5 seconds
    const timer = setTimeout(() => {
      setShowSecurityMessage(false);
    }, 6000);
    
    return () => clearTimeout(timer);
  }, []);

  // Presence tracking
  useEffect(() => {
    if (!isAuthReady || (!currentUser && !guestNick)) return;

    const updatePresence = async () => {
      try {
        const name = currentUser || guestNick || 'Convidado';
        await setDoc(doc(db, 'presence', userId), {
          userId,
          name,
          lastActive: Date.now(),
          isAdmin: !!currentUser
        });
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [isAuthReady, currentUser, guestNick, userId]);

  // Online users counter and presence map
  useEffect(() => {
    if (!isAuthReady) return;
    const q = query(collection(db, 'presence'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = Date.now();
      const newPresenceMap: Record<string, string> = {};
      const active = snapshot.docs.filter(doc => {
        const data = doc.data();
        newPresenceMap[data.userId] = data.name;
        return data.lastActive > now - 60000; // Active in the last minute
      });
      setPresenceMap(newPresenceMap);
      setOnlineUsers(active.length);
    });
    return () => unsubscribe();
  }, [isAuthReady]);

  // Listen to server settings
  useEffect(() => {
    if (!isAuthReady) return;
    const unsubscribe = onSnapshot(doc(db, 'settings', 'server'), (snapshot) => {
      if (snapshot.exists()) {
        setServerName(snapshot.data().name);
      } else {
        // Initialize if not exists
        setDoc(doc(db, 'settings', 'server'), { name: '🦖 Domínio dos Dinossauros' });
      }
    });
    return () => unsubscribe();
  }, [isAuthReady]);

  // Listen to channels
  useEffect(() => {
    if (!isAuthReady) return;
    const q = query(collection(db, 'channels'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const channelsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Channel[];
      setChannels(channelsData);
      
      // Set default channel if none active
      if (channelsData.length > 0 && !activeChannelId) {
        setActiveChannelId(channelsData[0].id);
      } else if (channelsData.length === 0) {
        // Create default channel if none exist
        addDoc(collection(db, 'channels'), {
          name: 'geral',
          createdAt: Date.now()
        });
      }
    }, (error) => {
      console.error("Error fetching channels:", error);
    });
    return () => unsubscribe();
  }, [isAuthReady]);

  // Listen to messages
  useEffect(() => {
    if (!isAuthReady || !activeChannelId) return;
    const q = query(
      collection(db, 'messages'), 
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Message[];
      
      // Filter by channelId manually since we might not have composite indexes yet
      // and for a small app it's fine.
      setMessages(messagesData.filter(m => m.channelId === activeChannelId));
    }, (error) => {
      console.error("Error fetching messages:", error);
    });
    return () => unsubscribe();
  }, [isAuthReady, activeChannelId]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('discord_user', currentUser);
    } else {
      localStorage.removeItem('discord_user');
    }
  }, [currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChannelId]);

  const activeChannel = channels.find(c => c.id === activeChannelId);
  const channelMessages = messages; // Already filtered in useEffect

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const username = (form.elements.namedItem('username') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    if (ADMINS[username] && ADMINS[username] === password) {
      setCurrentUser(username);
      setShowLoginModal(false);
      setLoginError(null);
      // Clear guest nick if logging in as admin
      localStorage.removeItem('cursed_isle_nick');
      setGuestNick(null);
    } else {
      setLoginError('Usuário ou senha incorretos!');
    }
  };

  const handleGuestLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const nick = (form.elements.namedItem('nick') as HTMLInputElement).value;
    if (nick && nick.trim()) {
      const trimmedNick = nick.trim();
      setGuestNick(trimmedNick);
      localStorage.setItem('cursed_isle_nick', trimmedNick);
      setShowGuestModal(false);
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (newChannelName && newChannelName.trim()) {
      try {
        const channelName = newChannelName.trim().toLowerCase().replace(/\s+/g, '-');
        await addDoc(collection(db, 'channels'), {
          name: channelName,
          color: newChannelColor || null,
          createdAt: Date.now()
        });
        setNewChannelName('');
        setNewChannelColor('');
        setShowCreateChannelModal(false);
      } catch (error) {
        const err = handleFirestoreError(error, OperationType.CREATE, 'channels');
        setAppError(`Erro ao criar canal: ${err.error}`);
      }
    }
  };

  const handleRenameChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !channelToRename) return;
    if (renameChannelName && renameChannelName.trim()) {
      try {
        const newName = renameChannelName.trim().toLowerCase().replace(/\s+/g, '-');
        await updateDoc(doc(db, 'channels', channelToRename.id), {
          name: newName,
          color: renameChannelColor || null
        });
        setRenameChannelName('');
        setRenameChannelColor('');
        setChannelToRename(null);
        setShowRenameChannelModal(false);
      } catch (error) {
        const err = handleFirestoreError(error, OperationType.UPDATE, `channels/${channelToRename.id}`);
        setAppError(`Erro ao renomear canal: ${err.error}`);
      }
    }
  };

  const handleSendPoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const optionsArray = typeof pollOptions === 'string' ? pollOptions.split('\n') : [];
    const filteredOptions = optionsArray.map(opt => opt.trim()).filter(opt => opt !== '');
    if (pollQuestion.trim() && filteredOptions.length >= 2) {
      try {
        await addDoc(collection(db, 'messages'), {
          channelId: activeChannelId,
          author: currentUser,
          authorUID: userId,
          content: `📊 ENQUETE: ${pollQuestion}`,
          timestamp: Date.now(),
          reactions: { '✅': [], '❌': [], '😄': [], '😍': [], '😭': [], '😡': [] },
          poll: {
            question: pollQuestion,
            options: filteredOptions,
            votes: {},
            expiresAt: Date.now() + 24 * 60 * 60 * 1000
          }
        });
        setPollQuestion('');
        setPollOptions('');
        setShowPollModal(false);
      } catch (error) {
        const err = handleFirestoreError(error, OperationType.CREATE, 'messages');
        setAppError(`Erro ao criar enquete: ${err.error}`);
      }
    }
  };

  const handleVote = async (messageId: string, optionIndex: number) => {
    try {
      const msgRef = doc(db, 'messages', messageId);
      await updateDoc(msgRef, {
        [`poll.votes.${userId}`]: optionIndex
      });
    } catch (error) {
      const err = handleFirestoreError(error, OperationType.UPDATE, `messages/${messageId}`);
      setAppError(`Erro ao votar: ${err.error}`);
    }
  };

  useEffect(() => {
    if (currentUser) {
      const q = query(collection(db, 'userProfiles'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const profile = snapshot.docs.find(doc => doc.data().userId === currentUser);
        if (profile) {
          setUserProfile({ ...profile.data() as UserProfile });
        }
      });
      return () => unsubscribe();
    }
  }, [currentUser]);

  const handleSendMessage = async (content: string, imageUrl?: string, imageLayout?: 'normal' | 'full' | 'center', color?: string, authorColor?: string) => {
    if (!currentUser && !guestNick) return;
    try {
      const reactions: Record<Reaction, string[]> = { '✅': [], '❌': [], '😄': [], '😍': [], '😭': [], '😡': [] };
      await addDoc(collection(db, 'messages'), {
        channelId: activeChannelId,
        author: currentUser || guestNick,
        authorUID: userId,
        content,
        imageUrl: imageUrl || null,
        imageLayout: imageLayout || 'normal',
        color: color || null,
        authorColor: authorColor || userProfile?.nameColor || null,
        authorFont: userProfile?.fontFamily || null,
        authorBold: userProfile?.isBold || false,
        authorItalic: userProfile?.isItalic || false,
        timestamp: Date.now(),
        reactions
      });
    } catch (error) {
      const err = handleFirestoreError(error, OperationType.CREATE, 'messages');
      setAppError(`Erro ao enviar mensagem: ${err.error}`);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!currentUser) return;
    setShowDeleteConfirmModal({ type: 'message', id: messageId });
  };

  const confirmDeleteMessage = async () => {
    if (!showDeleteConfirmModal || showDeleteConfirmModal.type !== 'message') return;
    try {
      await deleteDoc(doc(db, 'messages', showDeleteConfirmModal.id));
      setShowDeleteConfirmModal(null);
    } catch (error) {
      const err = handleFirestoreError(error, OperationType.DELETE, `messages/${showDeleteConfirmModal.id}`);
      setAppError(`Erro ao apagar mensagem: ${err.error}`);
    }
  };

  const handleDeleteChannel = async (channelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;
    if (channels.length <= 1) {
      // We could show a specific error modal here, but for now just log
      console.warn("Cannot delete last channel");
      return;
    }
    setShowDeleteConfirmModal({ type: 'channel', id: channelId });
  };

  const confirmDeleteChannel = async () => {
    if (!showDeleteConfirmModal || showDeleteConfirmModal.type !== 'channel') return;
    const channelId = showDeleteConfirmModal.id;
    try {
      await deleteDoc(doc(db, 'channels', channelId));
      if (activeChannelId === channelId) {
        const otherChannel = channels.find(c => c.id !== channelId);
        if (otherChannel) setActiveChannelId(otherChannel.id);
      }
      setShowDeleteConfirmModal(null);
    } catch (error) {
      const err = handleFirestoreError(error, OperationType.DELETE, `channels/${channelId}`);
      setAppError(`Erro ao apagar canal: ${err.error}`);
    }
  };

  const handleUpdateServerName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (newServerName.trim()) {
      try {
        await setDoc(doc(db, 'settings', 'server'), { name: newServerName.trim() });
        setShowEditServerNameModal(false);
        setNewServerName('');
      } catch (error) {
        const err = handleFirestoreError(error, OperationType.WRITE, 'settings/server');
        setAppError(`Erro ao atualizar servidor: ${err.error}`);
      }
    }
  };

  const handleReact = async (messageId: string, reaction: Reaction) => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      if (!messageDoc.exists()) return;
      
      const data = messageDoc.data();
      const currentReactions = data.reactions?.[reaction];
      
      if (!Array.isArray(currentReactions)) {
        // Migrate or initialize
        await updateDoc(messageRef, {
          [`reactions.${reaction}`]: [userId]
        });
      } else {
        if (currentReactions.includes(userId)) {
          await updateDoc(messageRef, {
            [`reactions.${reaction}`]: arrayRemove(userId)
          });
        } else {
          await updateDoc(messageRef, {
            [`reactions.${reaction}`]: arrayUnion(userId)
          });
        }
      }
    } catch (error) {
      const err = handleFirestoreError(error, OperationType.UPDATE, `messages/${messageId}`);
      setAppError(`Erro ao reagir: ${err.error}`);
    }
  };

  const handleSaveProfile = async (profileData: Partial<UserProfile>) => {
    if (!currentUser) return;
    try {
      // Let's use currentUser (the @username) as the doc ID for simplicity in this case
      await setDoc(doc(db, 'userProfiles', currentUser), {
        userId: currentUser,
        ...profileData
      }, { merge: true });
      
      setShowProfileModal(false);
    } catch (error) {
      const err = handleFirestoreError(error, OperationType.WRITE, `userProfiles/${currentUser}`);
      setAppError(`Erro ao salvar perfil: ${err.error}`);
    }
  };

  return (
    <div className="flex h-screen bg-[#313338] text-gray-200 font-sans overflow-hidden">
      {/* Security Message Banner */}
      {showSecurityMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-md animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-emerald-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 border border-emerald-400/30 backdrop-blur-md bg-emerald-500/90">
            <div className="bg-white/20 p-2 rounded-full">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="font-bold text-sm">Conexão Segura</h3>
              <p className="text-xs text-emerald-50/90">Este site utiliza criptografia de ponta e proteção avançada contra ataques.</p>
            </div>
            <button 
              onClick={() => setShowSecurityMessage(false)}
              className="ml-auto p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {showProfileModal && (
        <ProfileModal 
          profile={userProfile} 
          onSave={handleSaveProfile} 
          onClose={() => setShowProfileModal(false)} 
        />
      )}
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-50 w-72 bg-[#2b2d31] flex flex-col transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="min-h-[6rem] py-4 flex items-center px-4 shadow-sm border-b border-[#1e1f22]/50 shrink-0 justify-between bg-gradient-to-r from-[#232428] to-[#2b2d31]">
          <h1 className="font-black text-xl md:text-2xl text-emerald-400 leading-tight tracking-tighter drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] uppercase italic break-words pr-2 flex-1">
            {serverName}
          </h1>
          <div className="flex items-center gap-1">
            {currentUser && (
              <button 
                onClick={() => { setNewServerName(serverName); setShowEditServerNameModal(true); }} 
                className="text-gray-400 hover:text-white p-2 transition-colors"
                title="Editar Nome do Servidor"
              >
                <Edit2 size={20} />
              </button>
            )}
            <button className="md:hidden text-gray-400 hover:text-white p-1" onClick={() => setIsSidebarOpen(false)}>
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          <div className="flex items-center justify-between text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2 px-1">
            <span>Canais</span>
            {currentUser && (
              <button onClick={() => setShowCreateChannelModal(true)} className="hover:text-gray-200" title="Criar Canal">
                <Plus size={16} />
              </button>
            )}
          </div>
          <div className="space-y-[2px]">
            {channels.map(channel => (
              <div
                key={channel.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setActiveChannelId(channel.id);
                  setIsSidebarOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setActiveChannelId(channel.id);
                    setIsSidebarOpen(false);
                  }
                }}
                className={`group w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                  activeChannelId === channel.id 
                    ? 'bg-[#404249] text-white' 
                    : 'text-gray-400 hover:bg-[#383a40] hover:text-gray-200'
                }`}
              >
                <Hash size={18} className="shrink-0" style={{ color: channel.color || '#6b7280' }} />
                <span className="truncate flex-1" style={{ color: channel.color || 'inherit' }}>{channel.name}</span>
                {currentUser && (
                  <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setChannelToRename(channel);
                        setRenameChannelName(channel.name);
                        setShowRenameChannelModal(true);
                      }}
                      className="p-2 text-gray-500 hover:text-white transition-colors"
                      title="Renomear Canal"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={(e) => handleDeleteChannel(channel.id, e)}
                      className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                      title="Apagar Canal"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* User Area */}
        <div className="h-14 bg-[#232428] flex items-center px-4 shrink-0 justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold shrink-0">
              {currentUser ? currentUser.charAt(0) : (guestNick ? guestNick.charAt(0) : 'G')}
            </div>
            <div className="truncate">
              <div className="text-sm font-semibold text-white truncate">
                {currentUser || guestNick || 'Convidado'}
              </div>
              <div className="text-[10px] text-gray-400 truncate flex flex-col">
                <div className="flex items-center gap-1">
                  {currentUser ? 'Administrador' : 'Membro'}
                  <span className="flex items-center gap-0.5 text-emerald-500 ml-1">
                    <Lock size={10} />
                    <span className="text-[10px] uppercase font-bold tracking-tighter">Protegido</span>
                  </span>
                </div>
                <div className="flex items-center gap-1 text-emerald-400 font-bold">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {onlineUsers} {onlineUsers === 1 ? 'Online' : 'Online'}
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            {isAdmin && (
              <button 
                onClick={() => setShowProfileModal(true)}
                className="p-2 hover:bg-[#383a40] rounded-md text-gray-400 hover:text-indigo-400 transition-colors"
                title="Personalizar Perfil"
              >
                <User size={18} />
              </button>
            )}
            {guestNick && (
              <button 
                onClick={() => setShowGuestModal(true)}
                className="p-2 hover:bg-[#383a40] rounded-md text-gray-400 hover:text-emerald-400 transition-colors"
                title="Mudar Nick"
              >
                <Edit2 size={18} />
              </button>
            )}
            {currentUser ? (
              <button onClick={() => setCurrentUser(null)} className="text-gray-400 hover:text-red-400 p-2 rounded-md hover:bg-[#383a40] transition-colors" title="Sair">
                <LogOut size={18} />
              </button>
            ) : (
              <button onClick={() => setShowLoginModal(true)} className="text-gray-400 hover:text-white p-2 rounded-md hover:bg-[#383a40] transition-colors" title="Login Admin">
                <LogIn size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#313338]">
        {/* Header */}
        <div className="h-12 flex items-center px-4 shadow-sm border-b border-[#1e1f22]/50 shrink-0 gap-3">
          <button className="md:hidden text-gray-400 hover:text-white" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2 text-white font-semibold min-w-0">
            <Hash size={20} className="text-gray-500 shrink-0" />
            <span className="truncate">{activeChannel?.name}</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col">
          {channelMessages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <Hash size={48} className="mb-4 opacity-20" />
              <p>Nenhuma mensagem no canal #{activeChannel?.name}</p>
              <p className="text-sm mt-1">Seja o primeiro a postar!</p>
            </div>
          ) : (
            <div className="mt-auto">
              {channelMessages.map(msg => (
                <MessageItem 
                  key={msg.id} 
                  message={msg} 
                  onReact={handleReact} 
                  onDelete={handleDeleteMessage}
                  onVote={handleVote}
                  isAdmin={!!currentUser}
                  currentUserId={userId}
                  presenceMap={presenceMap}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        {(currentUser || guestNick) ? (
          <MessageInput 
            onSend={handleSendMessage} 
            onPoll={() => setShowPollModal(true)}
            channelName={activeChannel?.name || ''} 
            isAdmin={!!currentUser} 
          />
        ) : (
          <div className="p-4 bg-[#313338] shrink-0">
            <div className="bg-[#383a40] rounded-lg p-3 text-center text-gray-400 text-sm">
              Identifique-se com seu nick do jogo para participar do chat.
            </div>
          </div>
        )}
      </div>

      {/* Error Toast */}
      {appError && (
        <div className="fixed bottom-4 right-4 z-[100] bg-red-500 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <span>{appError}</span>
          <button onClick={() => setAppError(null)} className="hover:bg-white/20 p-1 rounded">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Poll Modal */}
      {showPollModal && (
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4">
          <div className="bg-[#313338] rounded-xl shadow-2xl w-full max-w-md p-6 border border-[#1e1f22] animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <BarChart2 className="text-green-400" /> Criar Enquete
              </h2>
              <button onClick={() => setShowPollModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-2">Pergunta</label>
                <input 
                  type="text" 
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="O que você quer perguntar?"
                  className="w-full bg-[#1e1f22] text-gray-200 rounded-md p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-2">Opções (uma por linha)</label>
                <textarea 
                  value={pollOptions}
                  onChange={(e) => setPollOptions(e.target.value)}
                  placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
                  rows={4}
                  className="w-full bg-[#1e1f22] text-gray-200 rounded-md p-3 outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => setShowPollModal(false)}
                  className="flex-1 bg-transparent hover:bg-[#404249] text-white font-semibold py-3 rounded-md transition-colors border border-gray-600"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSendPoll}
                  disabled={!pollQuestion.trim() || !pollOptions.trim()}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-3 rounded-md transition-colors"
                >
                  Enviar Enquete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Guest Login Modal */}
      {showGuestModal && (
        <div className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#313338] rounded-xl shadow-2xl w-full max-w-md p-8 border border-emerald-500/30 animate-in fade-in zoom-in duration-300 relative overflow-hidden">
            {/* Decorative background element */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl" />
            
            <div className="text-center mb-8 relative z-10">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                <span className="text-4xl">🦖</span>
              </div>
              <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-2 bg-gradient-to-br from-white to-emerald-400 bg-clip-text text-transparent">The Cursed Isle</h2>
              <p className="text-gray-400 text-sm font-medium">Identifique-se para entrar no domínio dos dinossauros</p>
            </div>
            
            <form onSubmit={handleGuestLogin} className="space-y-6 relative z-10">
              <div>
                <label className="block text-[10px] font-black text-emerald-500 uppercase mb-2 tracking-[0.2em] ml-1">Seu Nick do Jogo</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                  <input 
                    type="text" 
                    name="nick" 
                    required
                    autoFocus
                    defaultValue={guestNick || ''}
                    placeholder="Ex: Rex_Killer"
                    className="w-full bg-[#1e1f22] text-white rounded-xl p-4 pl-12 outline-none border-2 border-[#1e1f22] focus:border-emerald-500 transition-all text-lg font-bold placeholder:text-gray-700"
                  />
                </div>
              </div>
              <button 
                type="submit" 
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl transition-all uppercase tracking-widest shadow-[0_4px_20px_rgba(5,150,105,0.3)] hover:scale-[1.02] active:scale-[0.98]"
              >
                Entrar no Servidor
              </button>
            </form>
            
            <div className="mt-8 text-center relative z-10">
              <button 
                onClick={() => { setShowGuestModal(false); setShowLoginModal(true); }}
                className="text-[10px] text-gray-500 hover:text-emerald-400 transition-colors uppercase font-black tracking-widest"
              >
                Acesso Administrativo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#313338] rounded-xl shadow-2xl w-full max-w-md p-6 border border-[#1e1f22]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Login Admin</h2>
              <button onClick={() => setShowLoginModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-md text-sm">
                  {loginError}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-2">Usuário</label>
                <input 
                  type="text" 
                  name="username" 
                  required
                  className="w-full bg-[#1e1f22] text-gray-200 rounded-md p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-2">Senha</label>
                <input 
                  type="password" 
                  name="password" 
                  required
                  className="w-full bg-[#1e1f22] text-gray-200 rounded-md p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button 
                type="submit" 
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-md transition-colors mt-6"
              >
                Entrar
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Create Channel Modal */}
      {showCreateChannelModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#313338] rounded-xl shadow-2xl w-full max-w-md p-6 border border-[#1e1f22]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Criar Canal</h2>
              <button onClick={() => setShowCreateChannelModal(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateChannel} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-2">Nome do Canal</label>
                <input 
                  type="text" 
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="ex: avisos-importantes"
                  required
                  autoFocus
                  className="w-full bg-[#1e1f22] text-gray-200 rounded-md p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-2">Cor do Canal</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'Padrão', value: '' },
                    { name: 'Vermelho', value: '#ff4444' },
                    { name: 'Verde', value: '#00c851' },
                    { name: 'Azul', value: '#33b5e5' },
                    { name: 'Amarelo', value: '#ffbb33' },
                    { name: 'Roxo', value: '#aa66cc' },
                    { name: 'Rosa', value: '#ff4081' },
                    { name: 'Laranja', value: '#ff8800' },
                    { name: 'Ciano', value: '#00e5ff' },
                  ].map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setNewChannelColor(c.value)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${newChannelColor === c.value ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c.value || '#383a40' }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setShowCreateChannelModal(false)}
                  className="flex-1 bg-transparent hover:bg-[#404249] text-white font-semibold py-3 rounded-md transition-colors border border-gray-600"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-md transition-colors"
                >
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Rename Channel Modal */}
      {showRenameChannelModal && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 sm:items-center items-start pt-20 sm:pt-4">
          <div className="bg-[#313338] rounded-xl shadow-2xl w-full max-w-md p-6 border border-[#1e1f22] animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Renomear Canal</h2>
              <button onClick={() => setShowRenameChannelModal(false)} className="p-2 text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleRenameChannel} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-2">Novo Nome do Canal</label>
                <input 
                  type="text" 
                  value={renameChannelName}
                  onChange={(e) => setRenameChannelName(e.target.value)}
                  placeholder="ex: novo-nome-canal"
                  required
                  className="w-full bg-[#1e1f22] text-gray-200 rounded-md p-4 outline-none focus:ring-2 focus:ring-indigo-500 text-base"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-2">Cor do Canal</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'Padrão', value: '' },
                    { name: 'Vermelho', value: '#ff4444' },
                    { name: 'Verde', value: '#00c851' },
                    { name: 'Azul', value: '#33b5e5' },
                    { name: 'Amarelo', value: '#ffbb33' },
                    { name: 'Roxo', value: '#aa66cc' },
                    { name: 'Rosa', value: '#ff4081' },
                    { name: 'Laranja', value: '#ff8800' },
                    { name: 'Ciano', value: '#00e5ff' },
                  ].map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setRenameChannelColor(c.value)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${renameChannelColor === c.value ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c.value || '#383a40' }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setShowRenameChannelModal(false)}
                  className="flex-1 bg-transparent hover:bg-[#404249] text-white font-semibold py-4 rounded-md transition-colors border border-gray-600"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-4 rounded-md transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Server Name Modal */}
      {showEditServerNameModal && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 sm:items-center items-start pt-20 sm:pt-4">
          <div className="bg-[#313338] rounded-xl shadow-2xl w-full max-w-md p-6 border border-[#1e1f22] animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Editar Servidor</h2>
              <button onClick={() => setShowEditServerNameModal(false)} className="p-2 text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleUpdateServerName} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase mb-2">Nome do Servidor</label>
                <input 
                  type="text" 
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  placeholder="ex: Meu Servidor Incrível"
                  required
                  className="w-full bg-[#1e1f22] text-gray-200 rounded-md p-4 outline-none focus:ring-2 focus:ring-indigo-500 text-base"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setShowEditServerNameModal(false)}
                  className="flex-1 bg-transparent hover:bg-[#404249] text-white font-semibold py-4 rounded-md transition-colors border border-gray-600"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-4 rounded-md transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#313338] rounded-xl shadow-2xl w-full max-w-md p-6 border border-[#1e1f22]">
            <h2 className="text-xl font-bold text-white mb-4">
              {showDeleteConfirmModal.type === 'channel' ? 'Apagar Canal' : 'Apagar Mensagem'}
            </h2>
            <p className="text-gray-300 mb-6">
              {showDeleteConfirmModal.type === 'channel' 
                ? 'Tem certeza que deseja apagar este canal? Todas as mensagens nele serão perdidas.' 
                : 'Tem certeza que deseja apagar esta mensagem? Esta ação não pode ser desfeita.'}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteConfirmModal(null)}
                className="flex-1 bg-transparent hover:bg-[#404249] text-white font-semibold py-2 rounded-md transition-colors border border-gray-600"
              >
                Cancelar
              </button>
              <button 
                onClick={showDeleteConfirmModal.type === 'channel' ? confirmDeleteChannel : confirmDeleteMessage}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 rounded-md transition-colors"
              >
                Apagar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

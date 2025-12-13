import React, { useState, useEffect, useRef } from 'react';
import { Button, Card, Form, Spinner, InputGroup } from 'react-bootstrap';
import { FaRobot, FaPaperPlane, FaTimes, FaExpandAlt, FaCompressAlt, FaCog, FaEye, FaEyeSlash } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sendMessageToAI, ChatMessage, fetchAvailableModels } from '../../services/aiService';
import { saveAppConfig, getAppConfig, CONFIG_KEYS } from '../../services/configService';
import { exportDataFromIndexedDB } from '../../services/driveSync';



interface ChatWidgetProps {}

interface UIMessage {
  role: 'user' | 'model';
  type: 'text';
  content: string | any;
  images?: string[];
}

const ChatWidget: React.FC<ChatWidgetProps> = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<ChatMessage[]>([]);

  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('gemini-2.0-flash-exp');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [showKey, setShowKey] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadConfig = async () => {
      const storedKey = await getAppConfig(CONFIG_KEYS.GEMINI_API_KEY);
      const storedModel = await getAppConfig(CONFIG_KEYS.GEMINI_MODEL);
      if (storedKey) setApiKey(storedKey);
      if (storedModel) setModelName(storedModel);
    };
    loadConfig();
  }, []);

  useEffect(() => {
    if (apiKey && showSettings) {
      fetchAvailableModels(apiKey).then(models => {
        if (models.length > 0) {
          setAvailableModels(models);
          // If current model is not in list, maybe switch? Or keep custom.
          // For now, let's keep it but ensure list options are available.
        }
      });
    }
  }, [apiKey, showSettings]);

  const handleSaveSettings = async () => {
    await saveAppConfig(CONFIG_KEYS.GEMINI_API_KEY, apiKey);
    await saveAppConfig(CONFIG_KEYS.GEMINI_MODEL, modelName);
    setShowSettings(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);



  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', type: 'text', content: userMessage }]);
    setIsLoading(true);

    try {
      // 1. Get fresh data
      const currentData = await exportDataFromIndexedDB();
      
      // 2. Send to AI
      const response = await sendMessageToAI(history, userMessage, currentData, apiKey, modelName);
      
      let aiResponseText = response.text;
      const aiResponseImages = response.images;



      setMessages(prev => [...prev, { role: 'model', type: 'text', content: aiResponseText, images: aiResponseImages }]);
      setHistory(prev => [
        ...prev, 
        { role: 'user', parts: [{ text: userMessage }] },
        { role: 'model', parts: [{ text: aiResponseText }] }
      ]);
      
    } catch (error) {
        console.error(error);
      setMessages(prev => [...prev, { role: 'model', type: 'text', content: "Sorry, something went wrong." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleOpen = () => setIsOpen(!isOpen);
  const toggleExpand = () => setIsExpanded(!isExpanded);

  if (!isOpen) {
    return (
      <Button 
        variant="primary" 
        className="position-fixed rounded-circle shadow d-flex align-items-center justify-content-center"
        style={{ bottom: '20px', right: '20px', width: '60px', height: '60px', zIndex: 1050 }}
        onClick={toggleOpen}
      >
        <FaRobot size={24} />
      </Button>
    );
  }

  return (
    <Card 
      className="position-fixed shadow"
      style={{ 
        bottom: isExpanded ? '0' : '20px', 
        right: isExpanded ? '0' : '20px', 
        width: isExpanded ? '100vw' : '350px', 
        height: isExpanded ? '100vh' : '500px', 
        zIndex: 1050,
        transition: 'all 0.3s ease'
      }}
    >
      <Card.Header className="d-flex justify-content-between align-items-center bg-primary text-white border-0">
        <div className="d-flex align-items-center gap-2">
            <FaRobot />
            <strong>FinBot</strong>
        </div>
        <div className="d-flex gap-2">
            <span role="button" className="p-1" onClick={() => setShowSettings(!showSettings)}><FaCog /></span>
            <span role="button" className="p-1" onClick={toggleExpand}>
                {isExpanded ? <FaCompressAlt /> : <FaExpandAlt />}
            </span>
            <span role="button" className="p-1" onClick={toggleOpen}><FaTimes /></span>
        </div>
      </Card.Header>
      <Card.Body className="d-flex flex-column p-0" style={{ overflow: 'hidden' }}>
        {showSettings ? (
            <div className="p-3 bg-body h-100 overflow-auto">
                <h6 className="mb-3">AI Configuration</h6>
                <Form.Group className="mb-3">
                    <Form.Label>Gemini API Key</Form.Label>
                    <InputGroup>
                        <Form.Control 
                            type={showKey ? "text" : "password"} 
                            placeholder="Enter API Key"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                        />
                         <Button variant="outline-secondary" onClick={() => setShowKey(!showKey)}>
                            {showKey ? <FaEyeSlash /> : <FaEye />}
                         </Button>
                    </InputGroup>
                    <Form.Text className="text-muted">
                        Stored securely in your synced database.
                    </Form.Text>
                </Form.Group>
                <Form.Group className="mb-3">
                    <Form.Label>Model</Form.Label>
                    <Form.Select value={modelName} onChange={(e) => setModelName(e.target.value)}>
                        {availableModels.length > 0 ? (
                            availableModels.map(model => (
                                <option key={model} value={model}>{model}</option>
                            ))
                        ) : (
                            <>
                                <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Experimental)</option>
                                <option value="gemini-2.0-flash-lite-preview-02-05">Gemini 2.0 Flash Lite</option>
                                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                            </>
                        )}
                    </Form.Select>
                </Form.Group>
                <div className="d-grid gap-2">
                    <Button variant="primary" onClick={handleSaveSettings}>Save Settings</Button>
                    <Button variant="secondary" onClick={() => setShowSettings(false)}>Back to Chat</Button>
                </div>
            </div>
        ) : (
            <>
        <div className="flex-grow-1 p-3 overflow-auto bg-body-tertiary">
          {messages.length === 0 && (
            <div className="text-center text-body-secondary mt-5">
              <FaRobot size={40} className="mb-3" />
              <p>Hi! I can analyze your finances or help you update records.</p>
              <p className="small">Try asking "What is my net worth?" or "Add an expense of $50 for Groceries"</p>
              {!apiKey && (
                  <div className="alert alert-warning mt-3 p-2 small">
                      API Key missing. Click the <FaCog /> icon to configure.
                  </div>
              )}
            </div>
          )}
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`d-flex ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'} mb-3`}
            >
              <div 
                className={`p-3 rounded-3 ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-body border shadow-sm text-body'}`}
                style={{ maxWidth: '85%' }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content as string}</ReactMarkdown>
                {msg.images && msg.images.map((img, i) => (
                    <img key={i} src={img} alt="AI Generated" className="img-fluid mt-2 rounded" />
                ))}
              </div>
            </div>
          ))}
          {isLoading && (
             <div className="d-flex justify-content-start mb-3">
                <div className="bg-body shadow-sm border p-3 rounded-3 text-body">
                    <Spinner animation="grow" size="sm" /> Thinking...
                </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-3 bg-body border-top">
          <InputGroup>
            <Form.Control
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={isLoading || !apiKey}
            />
            <Button variant="primary" onClick={handleSend} disabled={isLoading || !input.trim() || !apiKey}>
              <FaPaperPlane />
            </Button>
          </InputGroup>
        </div>
        </>
        )}
      </Card.Body>
    </Card>
  );
};

export default ChatWidget;

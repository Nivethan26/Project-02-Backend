const Inventory = require('../models/Inventory');
const ChatbotMessage = require('../models/ChatbotMessage');

// Quota management for OpenAI usage
let openaiUsage = {
  dailyRequests: 0,
  dailyTokens: 0,
  lastReset: new Date().toDateString(),
  quotaLimit: 100, // Daily request limit for free tier
  tokenLimit: 1000 // Daily token limit for free tier
};

/**
 * Check and update OpenAI quota usage
 */
function checkOpenAIQuota() {
  const today = new Date().toDateString();
  
  // Reset daily counters
  if (today !== openaiUsage.lastReset) {
    openaiUsage.dailyRequests = 0;
    openaiUsage.dailyTokens = 0;
    openaiUsage.lastReset = today;
  }
  
  // Check if approaching limits
  const requestUsage = openaiUsage.dailyRequests / openaiUsage.quotaLimit;
  const tokenUsage = openaiUsage.dailyTokens / openaiUsage.tokenLimit;
  
  if (requestUsage > 0.8 || tokenUsage > 0.8) {
    console.log('[CHATBOT] OpenAI quota approaching limits:', {
      requests: `${openaiUsage.dailyRequests}/${openaiUsage.quotaLimit}`,
      tokens: `${openaiUsage.dailyTokens}/${openaiUsage.tokenLimit}`
    });
    return { approachingLimit: true, usage: openaiUsage };
  }
  
  return { approachingLimit: false, usage: openaiUsage };
}

/**
 * Update OpenAI usage counters
 */
function updateOpenAIUsage(tokens) {
  openaiUsage.dailyRequests += 1;
  openaiUsage.dailyTokens += tokens || 0;
  
  console.log('[CHATBOT] OpenAI usage updated:', {
    dailyRequests: openaiUsage.dailyRequests,
    dailyTokens: openaiUsage.dailyTokens
  });
}

/**
 * Check database connection status
 */
function checkDatabaseConnection() {
  const mongoose = require('mongoose');
  const connectionState = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[connectionState] || 'unknown';
}

/**
 * Wait for database connection to be ready
 */
async function waitForDatabaseConnection(maxWaitTime = 10000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    const status = checkDatabaseConnection();
    console.log('[CHATBOT] Database status check:', status);
    
    if (status === 'connected') {
      console.log('[CHATBOT] Database is ready');
      return true;
    } else if (status === 'connecting') {
      console.log('[CHATBOT] Database is connecting, waiting...');
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
    } else {
      console.log('[CHATBOT] Database status:', status);
      break;
    }
  }
  
  return false;
}

/**
 * Test database connectivity and models
 */
async function testDatabaseConnection() {
  try {
    // First wait for connection to be ready
    const isReady = await waitForDatabaseConnection();
    if (!isReady) {
      console.log('[CHATBOT] Database connection timeout');
      return false;
    }
    
    const dbStatus = checkDatabaseConnection();
    console.log('[CHATBOT] Final database status:', dbStatus);
    
    if (dbStatus === 'connected') {
      // Test if we can query the database
      const count = await Inventory.countDocuments();
      console.log('[CHATBOT] Database test successful - Inventory count:', count);
      return true;
    } else {
      console.log('[CHATBOT] Database not connected');
      return false;
    }
  } catch (error) {
    console.error('[CHATBOT] Database test failed:', error.message);
    return false;
  }
}

/**
 * Use ChatGPT to extract search intent from user query
 */
async function extractSearchIntentWithAI(userQuery) {
  const openaiKey = process.env.OPENAI_API_KEY;
  
  console.log('[CHATBOT] extractSearchIntentWithAI called with:', userQuery);
  console.log('[CHATBOT] OpenAI key available:', !!openaiKey);
  
  if (!openaiKey) {
    console.log('[CHATBOT] No OpenAI key, using fallback');
    // Fallback: simple keyword extraction without AI
    return extractFallbackKeywords(userQuery);
  }

  // Check quota before making API call
  const quotaCheck = checkOpenAIQuota();
  if (quotaCheck.approachingLimit) {
    console.log('[CHATBOT] OpenAI quota approaching limits, using fallback');
    return extractFallbackKeywords(userQuery);
  }

  try {
    // Lazy import to avoid dependency if not configured
    let OpenAI;
    try {
      console.log('[CHATBOT] Loading OpenAI module...');
      OpenAI = require('openai');
      console.log('[CHATBOT] OpenAI module loaded successfully');
    } catch (moduleError) {
      console.error('[CHATBOT] Failed to load OpenAI module for search intent:', moduleError.message);
      console.log('[CHATBOT] Using fallback due to module error');
      return extractFallbackKeywords(userQuery);
    }
    
    console.log('[CHATBOT] Creating OpenAI client...');
    const client = new OpenAI({ apiKey: openaiKey });
    console.log('[CHATBOT] OpenAI client created successfully');

    const prompt = `You are a pharmacy search assistant. Analyze this query and:

1. Correct any spelling mistakes
2. Extract the main product or medical terms
3. Return ONLY the corrected search keywords, separated by spaces

Examples:
- "vitemin c" → "vitamin c"
- "paracetamol" → "acetaminophen"
- "aspirin" → "aspirin"
- "pain killer" → "pain relief"

Query: "${userQuery}"

Return only the corrected keywords:`;

    console.log('[CHATBOT] Sending request to OpenAI...');
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a pharmacy search assistant. Correct spelling and extract essential product names, ingredients, or medical terms from user queries.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1, // Low temperature for consistent extraction
      max_tokens: 30, // Reduced from 50 to save tokens
    });

    const extractedTerms = completion.choices?.[0]?.message?.content?.trim() || '';
    const tokens = completion.usage?.total_tokens || 0;
    
    // Update usage counters
    updateOpenAIUsage(tokens);
    
    console.log('[CHATBOT] AI extracted search terms:', extractedTerms);
    
    if (extractedTerms && extractedTerms !== userQuery.toLowerCase()) {
      const terms = extractedTerms.split(' ').filter(word => word.length > 0);
      console.log('[CHATBOT] Returning AI extracted terms:', terms);
      
      // Check if there was a spelling correction
      const originalWords = userQuery.toLowerCase().split(' ');
      const correctedWords = extractedTerms.toLowerCase().split(' ');
      const hasSpellingCorrection = originalWords.some((word, index) => 
        correctedWords[index] && word !== correctedWords[index]
      );
      
      if (hasSpellingCorrection) {
        console.log('[CHATBOT] Spelling correction detected:', userQuery, '→', extractedTerms);
        // Store correction info for response
        global.lastSpellingCorrection = {
          original: userQuery,
          corrected: extractedTerms,
          suggestion: `Did you mean "${extractedTerms}"?`
        };
      }
      
      return terms;
    }
    
    console.log('[CHATBOT] AI extraction failed or returned same query, using fallback');
    // Fallback if AI extraction fails
    return extractFallbackKeywords(userQuery);
    
  } catch (error) {
    console.error('[CHATBOT] AI extraction failed:', error.message);
    console.error('[CHATBOT] AI extraction error stack:', error.stack);
    console.log('[CHATBOT] Using fallback due to AI error');
    return extractFallbackKeywords(userQuery);
  }
}

/**
 * Simple fallback keyword extraction when AI is not available
 */
function extractFallbackKeywords(query) {
  const normalized = query.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Remove common question words and keep meaningful terms
  const questionWords = ['is', 'are', 'what', 'where', 'when', 'how', 'why', 'do', 'does', 'can', 'could', 'would', 'will', 'have', 'has', 'show', 'find', 'search', 'look', 'check', 'get', 'buy', 'order', 'need', 'want', 'available', 'stock', 'price', 'cost'];
  
  const words = normalized.split(' ')
    .filter(word => word.length > 2 && !questionWords.includes(word))
    .filter(word => !/^\d+$/.test(word));
  
  console.log('[CHATBOT] Fallback extracted keywords:', words);
  return words;
}

/**
 * Smart product search using extracted terms with relevance scoring
 */
async function searchProducts(searchTerms, limit = 5) {
  if (!searchTerms || searchTerms.length === 0) {
    console.log('[CHATBOT] searchProducts: No search terms provided');
    return [];
  }

  console.log('[CHATBOT] searchProducts called with terms:', searchTerms, 'limit:', limit);

  try {
    // Create search conditions with relevance priority
    const searchConditions = [];
    
    // Strategy 1: Exact phrase match in name (highest priority)
    if (searchTerms.length > 1) {
      const phrase = searchTerms.join(' ');
      searchConditions.push({
        name: { $regex: phrase, $options: 'i' }
      });
    }
    
    // Strategy 2: All terms in name (very high priority)
    if (searchTerms.length > 1) {
      const allTermsInName = searchTerms.map(term => ({
        name: { $regex: term, $options: 'i' }
      }));
      searchConditions.push({ $and: allTermsInName });
    }
    
    // Strategy 3: Individual terms in name (high priority)
    const nameMatches = searchTerms.map(term => ({
      name: { $regex: term, $options: 'i' }
    }));
    searchConditions.push({ $or: nameMatches });
    
    // Strategy 4: Terms in description or other fields (lower priority)
    // Only search in these fields if the terms are actually relevant
    if (searchTerms.some(term => {
      const termLower = term.toLowerCase();
      return termLower.includes('vitamin') || termLower.includes('supplement') || 
             termLower.includes('medicine') || termLower.includes('tablet') ||
             termLower.includes('capsule') || termLower.includes('pain') ||
             termLower.includes('fever') || termLower.includes('cold');
    })) {
      const otherFieldMatches = searchTerms.map(term => ({
        $or: [
          { description: { $regex: term, $options: 'i' } },
          { tags: { $regex: term, $options: 'i' } },
          { brand: { $regex: term, $options: 'i' } },
          { category: { $regex: term, $options: 'i' } }
        ]
      }));
      searchConditions.push({ $or: otherFieldMatches });
    }

    const finalCondition = { $or: searchConditions, status: 'active' };
    console.log('[CHATBOT] Search condition:', JSON.stringify(finalCondition, null, 2));

    console.log('[CHATBOT] Executing database query...');
    
    // Get more results initially for better relevance scoring
    const allDocs = await Inventory.find(finalCondition)
      .select('name description price brand category packSize')
      .limit(limit * 3) // Get more results for scoring
      .lean();

    console.log(`[CHATBOT] Found ${allDocs.length} products for terms: [${searchTerms.join(', ')}]`);
    console.log('[CHATBOT] All found products:', allDocs.map(d => d.name));

    // Score and rank products by relevance
    const scoredDocs = allDocs.map(doc => {
      let score = 0;
      const name = doc.name.toLowerCase();
      const description = (doc.description || '').toLowerCase();
      
      // Score based on where terms appear
      searchTerms.forEach(term => {
        const termLower = term.toLowerCase();
        
        // Highest score: term in product name
        if (name.includes(termLower)) {
          score += 100;
          // Bonus for exact match
          if (name === termLower) score += 50;
          // Bonus for term at start of name
          if (name.startsWith(termLower)) score += 25;
        }
        
        // Medium score: term in description
        if (description.includes(termLower)) {
          score += 20;
        }
        
        // Lower score: term in other fields
        if (doc.brand && doc.brand.toLowerCase().includes(termLower)) score += 15;
        if (doc.category && doc.category.toLowerCase().includes(termLower)) score += 10;
        if (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(termLower))) score += 5;
      });
      
      // Bonus for exact phrase matches
      if (searchTerms.length > 1) {
        const phrase = searchTerms.join(' ').toLowerCase();
        if (name.includes(phrase)) score += 75;
      }
      
      // BONUS: Extra points for medical/vitamin products
      if (searchTerms.some(term => term.toLowerCase().includes('vitamin'))) {
        if (name.toLowerCase().includes('vitamin') || description.toLowerCase().includes('vitamin')) {
          score += 150; // Big bonus for vitamin products
        }
      }
      
      // PENALTY: Heavily penalize products that don't match the main search intent
      // If searching for "vitamin c", heavily penalize products that don't contain "vitamin"
      if (searchTerms.length > 0) {
        const mainTerm = searchTerms[0].toLowerCase();
        if (!name.includes(mainTerm) && !description.includes(mainTerm)) {
          score -= 100; // Reduced penalty
        }
      }
      
      return { ...doc, relevanceScore: score };
    });

    // Sort by relevance score and take top results
    const topResults = scoredDocs
      .filter(doc => doc.relevanceScore > -50) // Allow some negative scores
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);

    // Final relevance check: ensure products actually contain the main search terms
    const finalResults = topResults.filter(doc => {
      const name = doc.name.toLowerCase();
      const description = (doc.description || '').toLowerCase();
      
      // Must contain at least one main search term in name or description
      return searchTerms.some(term => 
        name.includes(term.toLowerCase()) || description.includes(term.toLowerCase())
      );
    });

    console.log('[CHATBOT] Top results with scores:', topResults.map(d => `${d.name} (score: ${d.relevanceScore})`));
    console.log('[CHATBOT] Final filtered results:', finalResults.map(d => `${d.name} (score: ${d.relevanceScore})`));

    // Format results for RAG context
    return finalResults.map(d => ({
      id: d._id?.toString?.() || String(d._id),
      url: `/products/${d._id}`,
      title: d.name,
      snippet: d.description || '',
      meta: {
        price: d.price,
        brand: d.brand,
        category: d.category,
        packSize: d.packSize,
      }
    }));
    
  } catch (error) {
    console.error('[CHATBOT] Search error:', error.message);
    console.error('[CHATBOT] Search error stack:', error.stack);
    
    // Fallback to simple search if complex search fails
    try {
      console.log('[CHATBOT] Trying fallback simple search...');
      const simpleDocs = await Inventory.find({
        $or: searchTerms.map(term => ({
          name: { $regex: term, $options: 'i' }
        })),
        status: 'active'
      })
      .select('name description price brand category packSize')
      .limit(limit)
      .lean();
      
      console.log('[CHATBOT] Fallback search found:', simpleDocs.length, 'products');
      
      return simpleDocs.map(d => ({
        id: d._id?.toString?.() || String(d._id),
        url: `/products/${d._id}`,
        title: d.name,
        snippet: d.description || '',
        meta: {
          price: d.price,
          brand: d.brand,
          category: d.category,
          packSize: d.packSize,
        }
      }));
      
    } catch (fallbackError) {
      console.error('[CHATBOT] Fallback search also failed:', fallbackError.message);
      console.error('[CHATBOT] Fallback error stack:', fallbackError.stack);
      return [];
    }
  }
}

/**
 * Check if query is a casual conversation (greeting, general chat)
 */
function isCasualConversation(query) {
  const casualPatterns = [
    /^(hi|hello|hey|good morning|good afternoon|good evening)/i,
    /^(how are you|how's it going|what's up|sup)/i,
    /^(thank you|thanks|thx|bye|goodbye|see you)/i,
    /^(yes|no|ok|okay|sure|maybe)/i,
    /^(help|support|assist)/i
  ];
  
  const result = casualPatterns.some(pattern => pattern.test(query.trim()));
  console.log('[CHATBOT] isCasualConversation check:', { query: query.trim(), result, patterns: casualPatterns.map(p => p.source) });
  
  return result;
}

/**
 * Generate casual conversation response
 */
async function generateCasualResponse(userMessage) {
  const openaiKey = process.env.OPENAI_API_KEY;
  
  console.log('[CHATBOT] generateCasualResponse called with:', userMessage);
  console.log('[CHATBOT] OpenAI key available:', !!openaiKey);
  
  if (!openaiKey) {
    console.log('[CHATBOT] No OpenAI key, using fallback');
    // Simple fallback response
    return 'Hello! Welcome to SK Medicals. How can I help you today?';
  }

  try {
    // Use OpenAI for natural casual conversation with specific guidance
    let OpenAI;
    try {
      console.log('[CHATBOT] Loading OpenAI module...');
      OpenAI = require('openai');
      console.log('[CHATBOT] OpenAI module loaded successfully');
    } catch (moduleError) {
      console.error('[CHATBOT] Failed to load OpenAI module:', moduleError.message);
      console.log('[CHATBOT] Using fallback due to module error');
      // Simple fallback response
      return 'Hello! Welcome to SK Medicals. How can I help you today?';
    }
    
    console.log('[CHATBOT] Creating OpenAI client...');
    const client = new OpenAI({ apiKey: openaiKey });
    console.log('[CHATBOT] OpenAI client created successfully');

    const prompt = `You are a friendly pharmacy assistant for SK Medicals. Respond naturally to this message with a warm, professional greeting.

IMPORTANT: For greetings, use these exact response styles:
- "hi" → "Hello! Welcome to SK Medicals. How can I help you today?"
- "how are you" → "I'm doing well, thank you for asking! How can I assist you with your pharmacy needs today?"
- "good morning" → "Good morning! Welcome to SK Medicals. What can I help you find today?"

Be helpful, warm, and professional. Keep responses brief (1-2 sentences).

User message: "${userMessage}"`;

    console.log('[CHATBOT] Sending request to OpenAI...');
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a friendly, professional pharmacy assistant for SK Medicals. For greetings, use warm, welcoming responses that match the user\'s tone.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3, // Lower temperature for more consistent responses
      max_tokens: 50, // Reduced from 100 to save tokens
    });

    const content = completion.choices?.[0]?.message?.content || 'Hello! How can I help you today?';
    console.log('[CHATBOT] OpenAI response received:', content);
    
    return content; // Return just the content string, not an object
    
  } catch (error) {
    console.error('[CHATBOT] AI casual response failed:', error.message);
    console.error('[CHATBOT] AI casual response error code:', error.code);
    
    // Handle specific OpenAI errors
    if (error.code === 'insufficient_quota' || error.message.includes('quota')) {
      console.log('[CHATBOT] OpenAI quota exceeded for casual response, using fallback');
      // Simple fallback response
      return 'Hello! Welcome to SK Medicals. How can I help you today?';
    } else if (error.code === 'rate_limit_exceeded') {
      console.log('[CHATBOT] OpenAI rate limit exceeded for casual response, using fallback');
      return 'Hello! Welcome to SK Medicals. How can I help you today?';
    } else {
      console.log('[CHATBOT] Other OpenAI error for casual response, using fallback');
      // Simple fallback response
      return 'Hello! Welcome to SK Medicals. How can I help you today?';
    }
  }
}

/**
 * Retrieve top-k product snippets from MongoDB as RAG context
 */
async function retrieveContext(query, limit = 5) {
  if (!query || !query.trim()) return [];

  // Check database connection first
  const dbStatus = checkDatabaseConnection();
  console.log('[CHATBOT] Database connection status:', dbStatus);
  
  if (dbStatus === 'disconnected') {
    console.error('[CHATBOT] Database is disconnected, cannot retrieve context');
    return [];
  }

  // Check if it's casual conversation first
  if (isCasualConversation(query)) {
    console.log('[CHATBOT] Detected casual conversation, no product search needed');
    return [];
  }

  try {
    // Use AI to extract search intent for product queries
    console.log('[CHATBOT] Extracting search intent for:', query);
    const searchTerms = await extractSearchIntentWithAI(query);
    console.log('[CHATBOT] Search terms extracted:', searchTerms);
    
    if (searchTerms.length === 0) {
      console.log('[CHATBOT] No search terms extracted, trying broad search');
      // Fallback to broad search
      const broadQuery = query.toLowerCase().replace(/[^\w\s]/g, ' ').trim();
      console.log('[CHATBOT] Broad search query:', broadQuery);
      
      const docs = await Inventory.find({
        $or: [
          { name: { $regex: broadQuery, $options: 'i' } },
          { description: { $regex: broadQuery, $options: 'i' } },
          { tags: { $regex: broadQuery, $options: 'i' } },
          { brand: { $regex: broadQuery, $options: 'i' } },
          { category: { $regex: broadQuery, $options: 'i' } }
        ],
        status: 'active'
      })
      .select('name description price brand category packSize')
      .limit(limit)
      .lean();
      
      console.log('[CHATBOT] Broad search found:', docs.length, 'products');
      
      const results = docs.map(d => ({
        id: d._id?.toString?.() || String(d._id),
        url: `/products/${d._id}`,
        title: d.name,
        snippet: d.description || '',
        meta: {
          price: d.price,
          brand: d.brand,
          category: d.category,
          packSize: d.packSize,
        }
      }));
      
      return results;
    }

    // Use extracted terms for intelligent search
    console.log('[CHATBOT] Using extracted terms for search:', searchTerms);
    const results = await searchProducts(searchTerms, limit);
    
    return results;
    
  } catch (error) {
    console.error('[CHATBOT] Error in retrieveContext:', error.message);
    console.error('[CHATBOT] Error stack:', error.stack);
    return [];
  }
}

/**
 * Generate a response using simple rules + optional OpenAI if configured
 */
async function generateResponse(userMessage, context) {
  const openaiKey = process.env.OPENAI_API_KEY;

  // Handle casual conversation
  if (isCasualConversation(userMessage)) {
    const casualResponse = await generateCasualResponse(userMessage);
    return { content: casualResponse, tokens: 0 }; // Wrap in expected format
  }

  // Handle product queries
  const contextText = context.map((c, idx) => `(${idx + 1}) ${c.title} — ${c.snippet} [brand:${c.meta.brand || '-'} | price:${c.meta.price || '-'} | url:${c.url}]`).join('\n');

  if (!openaiKey) {
    // Fallback deterministic answer with context bullets
    let reply = '';
    if (context.length === 0) {
      reply = `No products found for "${userMessage}". Try different keywords or contact our staff for assistance.`;
    } else if (context.length === 1) {
      const product = context[0];
      let spellingNote = '';
      if (global.lastSpellingCorrection) {
        spellingNote = `\n\n💡 ${global.lastSpellingCorrection.suggestion}`;
      }
      reply = `I found 1 product that matches your query:\n\n${product.title}${product.meta.brand ? ` (${product.meta.brand})` : ''}${product.meta.price ? ` — Rs.${product.meta.price}` : ''}\n\n${product.snippet || 'No description available'}${spellingNote}`;
    } else {
      const products = context.map((c, i) => `${i + 1}. ${c.title}${c.meta.brand ? ` (${c.meta.brand})` : ''}${c.meta.price ? ` — Rs.${c.meta.price}` : ''}`).join('\n');
      let spellingNote = '';
      if (global.lastSpellingCorrection) {
        spellingNote = `\n\n💡 ${global.lastSpellingCorrection.suggestion}`;
      }
      reply = `I found ${context.length} products related to your query:\n\n${products}${spellingNote}`;
    }
    return { content: reply, tokens: 0 };
  }

  // Use OpenAI for product query responses
  let OpenAI;
  try {
    OpenAI = require('openai');
  } catch (moduleError) {
    console.error('[CHATBOT] Failed to load OpenAI module for product query:', moduleError.message);
    // Fallback to simple response without AI
    let reply = '';
    if (context.length === 0) {
      reply = `No products found for "${userMessage}". Try different keywords or contact our staff for assistance.`;
    } else if (context.length === 1) {
      const product = context[0];
      let spellingNote = '';
      if (global.lastSpellingCorrection) {
        spellingNote = `\n\n💡 ${global.lastSpellingCorrection.suggestion}`;
      }
      reply = `I found 1 product that matches your query:\n\n${product.title}${product.meta.brand ? ` (${product.meta.brand})` : ''}${product.meta.price ? ` — Rs.${product.meta.price}` : ''}\n\n${product.snippet || 'No description available'}${spellingNote}`;
    } else {
      const products = context.map((c, i) => `${i + 1}. ${c.title}${c.meta.brand ? ` (${c.meta.brand})` : ''}${c.meta.price ? ` — Rs.${c.meta.price}` : ''}`).join('\n');
      let spellingNote = '';
      if (global.lastSpellingCorrection) {
        spellingNote = `\n\n💡 ${global.lastSpellingCorrection.suggestion}`;
      }
      reply = `I found ${context.length} products related to your query:\n\n${products}${spellingNote}`;
    }
    return { content: reply, tokens: 0 };
  }
  
  const client = new OpenAI({ apiKey: openaiKey });

  const prompt = `You are a helpful pharmacy assistant for SK Medicals. Use the CONTEXT to answer briefly and accurately.

IMPORTANT RULES:
- Do NOT include raw URLs or links in your response
- Focus on product names, brands, prices, and descriptions
- Keep responses professional and customer-friendly
- If products are found, describe them clearly
- If no products found, say so politely

CONTEXT:\n${contextText || '(no matches)'}
QUESTION: ${userMessage}

Answer in 2-4 sentences with product details only. No URLs.`;

  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a pharmacy assistant for SK Medicals. Provide product information clearly without including URLs or technical links. Focus on product names, brands, prices, and descriptions.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 80, // Reduced to save tokens
    });

    const content = completion.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
    const tokens = completion.usage?.total_tokens || 0;
    return { content, tokens };
    
  } catch (openaiError) {
    console.error('[CHATBOT] OpenAI API error:', openaiError.message);
    console.error('[CHATBOT] OpenAI error code:', openaiError.code);
    
    // Handle specific OpenAI errors
    if (openaiError.code === 'insufficient_quota' || openaiError.message.includes('quota')) {
      console.log('[CHATBOT] OpenAI quota exceeded, using fallback response');
      // Provide a good fallback response when quota is exceeded
      let reply = '';
      if (context.length === 0) {
        reply = `No products found for "${userMessage}". Try different keywords or contact our staff for assistance.`;
      } else if (context.length === 1) {
        const product = context[0];
        let spellingNote = '';
        if (global.lastSpellingCorrection) {
          spellingNote = `\n\n💡 ${global.lastSpellingCorrection.suggestion}`;
        }
        reply = `I found 1 product that matches your query:\n\n${product.title}${product.meta.brand ? ` (${product.meta.brand})` : ''}${product.meta.price ? ` — Rs.${product.meta.price}` : ''}\n\n${product.snippet || 'No description available'}${spellingNote}`;
      } else {
        const products = context.map((c, i) => `${i + 1}. ${c.title}${c.meta.brand ? ` (${c.meta.brand})` : ''}${c.meta.price ? ` — Rs.${c.meta.price}` : ''}`).join('\n');
        let spellingNote = '';
        if (global.lastSpellingCorrection) {
          spellingNote = `\n\n💡 ${global.lastSpellingCorrection.suggestion}`;
        }
        reply = `I found ${context.length} products related to your query:\n\n${products}${spellingNote}`;
      }
      return { content: reply, tokens: 0 };
    } else if (openaiError.code === 'rate_limit_exceeded') {
      console.log('[CHATBOT] OpenAI rate limit exceeded, using fallback response');
      if (context.length === 0) {
        return { content: `No products found for "${userMessage}". Try different keywords or contact our staff for assistance.`, tokens: 0 };
      }
      return { content: 'I\'m experiencing high demand right now. Here are the products I found:\n\n' + context.map((c, i) => `${i + 1}. ${c.title}${c.meta.brand ? ` (${c.meta.brand})` : ''}${c.meta.price ? ` — Rs.${c.meta.price}` : ''}`).join('\n'), tokens: 0 };
    } else {
      console.log('[CHATBOT] Other OpenAI error, using fallback response');
      // Generic fallback for other OpenAI errors
      let reply = '';
      if (context.length === 0) {
        reply = `No products found for "${userMessage}". Try different keywords or contact our staff for assistance.`;
      } else if (context.length === 1) {
        const product = context[0];
        let spellingNote = '';
        if (global.lastSpellingCorrection) {
          spellingNote = `\n\n💡 ${global.lastSpellingCorrection.suggestion}`;
        }
        reply = `I found 1 product that matches your query:\n\n${product.title}${product.meta.brand ? ` (${c.meta.brand})` : ''}${product.meta.price ? ` — Rs.${product.meta.price}` : ''}\n\n${product.snippet || 'No description available'}${spellingNote}`;
      } else {
        const products = context.map((c, i) => `${i + 1}. ${c.title}${c.meta.brand ? ` (${c.meta.brand})` : ''}${c.meta.price ? ` — Rs.${c.meta.price}` : ''}`).join('\n');
        let spellingNote = '';
        if (global.lastSpellingCorrection) {
          spellingNote = `\n\n💡 ${global.lastSpellingCorrection.suggestion}`;
        }
        reply = `I found ${context.length} products related to your query:\n\n${products}${spellingNote}`;
      }
      return { content: reply, tokens: 0 };
    }
  }
}

async function saveMessage(doc) {
  try { await ChatbotMessage.create(doc); } catch (_) {}
}

async function handleChat(userId, conversationId, userText) {
  try {
    const q = (userText || '').trim();
    if (!q) return { content: 'Please type a message.', sources: [] };

    console.log('[CHATBOT] Processing query:', q);
    
    // Check if it's a casual conversation first
    if (isCasualConversation(q)) {
      console.log('[CHATBOT] Casual conversation detected, processing without database check');
      
      // For casual conversations, we don't need database
      const response = await generateCasualResponse(q);
      const assistant = { 
        conversationId, 
        userId, 
        role: 'assistant', 
        content: response, 
        tokens: 0, 
        sources: [] 
      };
      
      // Try to save messages, but don't fail if database is down
      try {
        await saveMessage({ conversationId, userId, role: 'user', content: q });
        await saveMessage(assistant);
      } catch (saveError) {
        console.log('[CHATBOT] Could not save messages (database issue):', saveError.message);
      }
      
      console.log('[CHATBOT] Casual conversation completed successfully');
      return assistant;
    }
    
    // For product queries, we need database connection
    console.log('[CHATBOT] Product query detected, checking database connection...');
    const dbWorking = await testDatabaseConnection();
    if (!dbWorking) {
      return {
        content: 'I\'m having trouble accessing the product database right now. Please try again in a moment, or ask me a general question.',
        tokens: 0,
        sources: []
      };
    }
    
    // Step 1: Retrieve context from database
    console.log('[CHATBOT] Step 1: Retrieving context from database...');
    const context = await retrieveContext(q, 5);
    console.log('[CHATBOT] Retrieved context:', context.length, 'products');
    
    // Step 2: Save user message
    console.log('[CHATBOT] Step 2: Saving user message...');
    await saveMessage({ conversationId, userId, role: 'user', content: q });
    
    // Step 3: Generate response
    console.log('[CHATBOT] Step 3: Generating response...');
    const response = await generateResponse(q, context);
    console.log('[CHATBOT] Response generated successfully:', {
      hasContent: !!response.content,
      contentLength: response.content ? response.content.length : 0,
      tokens: response.tokens || 0
    });

    // Step 4: Save assistant message
    console.log('[CHATBOT] Step 4: Saving assistant message...');
    const assistant = { 
      conversationId, 
      userId, 
      role: 'assistant', 
      content: response.content, 
      tokens: response.tokens || 0, 
      sources: context 
    };
    await saveMessage(assistant);
    
    console.log('[CHATBOT] Product query completed successfully');
    return assistant;
    
  } catch (error) {
    console.error('[CHATBOT] Error in handleChat:', error.message);
    console.error('[CHATBOT] Error stack:', error.stack);
    console.error('[CHATBOT] Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      errno: error.errno
    });
    
    // Return a helpful error message instead of crashing
    return {
      content: 'I encountered an issue while processing your request. Please try rephrasing your question or try again in a moment.',
      tokens: 0,
      sources: []
    };
  }
}

module.exports = { retrieveContext, generateResponse, handleChat };




/**
 * CRITICAL MODULE: ĐỊA AI - HỌC LIỆU SỐ THÔNG MINH
 * STATUS: OPTIMIZED FOR NANO BANANA PRO & REAL-TIME MULTIMODAL RAG
 */

import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";
import { DocumentChunk, Topic } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

let localKnowledgeBase: DocumentChunk[] = [];

const GEOGRAPHY_ASSISTANT_INSTRUCTION = `
VAI TRÒ:
Bạn là "Địa AI" – trợ lý học liệu số thông minh chuyên biệt về Địa lí THCS.

KHẢ NĂNG THỊ GIÁC & OCR (MULTIMODAL RAG):
- Khi người dùng chụp ảnh hoặc tải tệp (bản đồ, biểu đồ, trang sách):
  1. Thực hiện OCR ngầm để trích xuất toàn bộ văn bản, số liệu.
  2. Phân tích trực quan: nhận diện ký hiệu, màu sắc trên bản đồ, xu hướng của các đường biểu đồ.
  3. Kết hợp dữ liệu hình ảnh với nội dung học liệu RAG đã nạp để đưa ra câu trả lời chính xác nhất.

QUY TẮC PHẢN HỒI:
1. Ưu tiên giải thích dữ liệu từ hình ảnh nếu có.
2. Ngôn ngữ: Ngắn gọn, trực quan, phù hợp trình độ học sinh.
3. Nếu hình ảnh mờ hoặc thiếu thông tin, hãy yêu cầu người dùng chụp lại góc gần hơn.
4. Trình bày: Sử dụng bảng dữ liệu hoặc danh sách để làm rõ các con số trích xuất từ ảnh.
`;

export const retrieveRelevantContext = (query: string): string => {
  if (!query) return "";
  const matches = localKnowledgeBase.filter(chunk => 
    chunk.content.toLowerCase().includes(query.toLowerCase()) ||
    chunk.metadata.topic.toLowerCase().includes(query.toLowerCase())
  );
  return matches.map(m => m.content).join('\n\n');
};

export const processDocumentToChunks = async (fileName: string, content: string, fileId: string): Promise<DocumentChunk[]> => {
  const mockChunks: DocumentChunk[] = [
    {
      id: `${fileId}-1`,
      fileId,
      content: `Nội dung từ ${fileName}: Kiến thức Địa lí đã được hệ thống hóa.`,
      metadata: { topic: "Tài liệu học tập", keywords: ["địa lí", "kiến thức"] }
    }
  ];
  localKnowledgeBase = [...localKnowledgeBase, ...mockChunks];
  return mockChunks;
};

export const generateGeographyAnswerStream = async (
  prompt: string, 
  context: string, 
  progress: number | null,
  imageData?: { data: string, mimeType: string },
  docFiles?: { data: string, mimeType: string }[]
) => {
  const ai = getAI();
  
  let backgroundContext = "";
  if (progress !== null && progress < 100) {
    backgroundContext = `\n[Hệ thống]: Đang nạp học liệu (${progress}%).`;
  } else if (progress === 100 || (progress === null && localKnowledgeBase.length > 0)) {
    backgroundContext = `\n[Hệ thống]: Đã sẵn sàng nạp tri thức từ ảnh/tài liệu.`;
  }

  const systemPrompt = GEOGRAPHY_ASSISTANT_INSTRUCTION + backgroundContext;
  
  const parts: any[] = [];
  if (context) {
    parts.push({ text: `Ngữ cảnh học liệu bổ trợ:\n${context}` });
  }
  if (imageData) {
    parts.push({ inlineData: imageData });
  }
  if (docFiles && docFiles.length > 0) {
    docFiles.forEach(file => {
      parts.push({ inlineData: file });
    });
  }
  
  let questionText = prompt;
  if (!questionText && imageData) {
    questionText = "Hãy phân tích hình ảnh này dựa trên kiến thức địa lí.";
  } else if (!questionText && docFiles && docFiles.length > 0) {
    questionText = "Phân tích nội dung các tệp này.";
  }

  parts.push({ text: `Câu hỏi: ${questionText}` });

  return await ai.models.generateContentStream({
    model: 'gemini-3-flash-preview',
    contents: { parts },
    config: {
      systemInstruction: systemPrompt
    }
  });
};

export const generateGeographyInfographic = async (userQuery: string, knowledgeText: string): Promise<string | null> => {
  const ai = getAI();
  
  const infographicPrompt = `
    Bạn là một chuyên gia đồ họa bản đồ học (Cartographic Architect). 
    Hãy tạo một infographic chất lượng cao giải thích về: "${userQuery}". 
    Dữ liệu nền tảng: "${knowledgeText}". 
    
    YÊU CẦU BẢN ĐỒ & THIẾT KẾ:
    - Thể hiện ĐẦY ĐỦ và CHÍNH XÁC chủ quyền biển đảo Việt Nam.
    - Nhãn quần đảo: "Đặc khu Hoàng Sa" và "Đặc khu Trường Sa". 
    - QUY TẮC NHÃN: TUYỆT ĐỐI KHÔNG vẽ khung nền hay box bao quanh các dòng chữ nhãn đảo. Chữ viết trực tiếp lên nền bản đồ một cách thanh thoát.
    - MÀU SẮC: Màu chữ của "Đặc khu Hoàng Sa" và "Đặc khu Trường Sa" phải CÙNG MÀU với màu chữ tiêu đề chính của infographic để đảm bảo sự đồng nhất.
    - CHỮ KÝ TÁC GIẢ: Ghi rõ dòng chữ "Th.s PVT THCS Hồng Hà, Ô Diên, Hà Nội" ở một góc trang trọng và tinh tế.
    - PHONG CÁCH: Khoa học, nét vẽ hài hòa, không phô trương, bố cục rõ ràng, chuyên nghiệp.
    - Ngôn ngữ: Tiếng Việt.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: infographicPrompt }] },
      config: { 
        imageConfig: { 
          aspectRatio: "16:9", 
          imageSize: "1K" 
        } 
      },
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
  } catch (e) { 
    console.error("Lỗi tạo Infographic:", e); 
  }
  return null;
};

export const getExamMatrix = async (topic: string, grade: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Ma trận đề thi Địa lí: "${topic}", ${grade}. Trả về JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            subject: { type: Type.STRING },
            questionType: { type: Type.STRING },
            quantity: { type: Type.INTEGER },
            levels: {
              type: Type.OBJECT,
              properties: {
                remember: { type: Type.INTEGER },
                understand: { type: Type.INTEGER },
                apply: { type: Type.INTEGER },
                highApply: { type: Type.INTEGER },
              },
              required: ["remember", "understand", "apply", "highApply"]
            }
          },
          required: ["name", "subject", "questionType", "quantity", "levels"]
        }
      },
    }
  });
  return JSON.parse(response.text || "[]");
};

export const generateExamSets = async (topics: Topic[], topicInput: string, grade: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Soạn đề thi cho ${grade}, chủ đề "${topicInput}". Ma trận: ${JSON.stringify(topics)}.`,
    config: { thinkingConfig: { thinkingBudget: 8000 } }
  });
  return response.text || "";
};

export const extractMatrixFromText = async (text: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Trích xuất ma trận sang JSON: \n\n ${text}`,
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text || "[]");
};

export const extractMatrixFromMedia = async (base64: string, mimeType: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ parts: [{ inlineData: { data: base64, mimeType } }, { text: "Trích xuất ma trận sang JSON." }] }],
    config: { responseMimeType: "application/json" }
  });
  return JSON.parse(response.text || "[]");
};

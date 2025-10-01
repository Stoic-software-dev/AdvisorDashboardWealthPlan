import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const questions = [
  {
    id: 1,
    category: "Risk Tolerance",
    text: "When you think about investing, how comfortable are you with taking risks?",
    options: [
      { value: 1, label: "I prioritize security and am willing to accept lower returns for minimal risk." },
      { value: 2, label: "I am cautious but willing to take some calculated risks for moderate returns." },
      { value: 3, label: "I am comfortable with market fluctuations and seek higher returns through increased risk." },
      { value: 4, label: "I am aggressive and willing to take significant risks for potentially substantial returns." },
    ]
  },
  {
    id: 2,
    category: "Market Volatility",
    text: "How would you react if your portfolio's value dropped by 20% in a short period?",
    options: [
      { value: 1, label: "I would be very concerned and likely sell some assets to reduce potential further losses." },
      { value: 2, label: "I would be concerned but would likely hold my investments, waiting for recovery." },
      { value: 3, label: "I would see it as a buying opportunity and consider investing more." },
      { value: 4, label: "I would not be overly concerned; I understand market volatility is part of the game." },
    ]
  },
  {
    id: 3,
    category: "Investment Objectives",
    text: "What is your primary financial goal for your investments?",
    options: [
      { value: 1, label: "Preservation of capital and generating stable income." },
      { value: 2, label: "Achieving steady growth with a balance of risk and stability." },
      { value: 3, label: "Long-term capital appreciation, even if it means short-term volatility." },
      { value: 4, label: "Aggressive growth, focusing on maximum capital appreciation." },
    ]
  },
  {
    id: 4,
    category: "Time Horizon",
    text: "What is your investment time horizon?",
    options: [
      { value: 1, label: "Short-term (less than 3 years)" },
      { value: 2, label: "Medium-term (3-7 years)" },
      { value: 3, label: "Long-term (8-15 years)" },
      { value: 4, label: "Very long-term (15+ years)" },
    ]
  },
  {
    id: 5,
    category: "Investment Knowledge",
    text: "How knowledgeable are you about investing and financial markets?",
    options: [
      { value: 1, label: "Limited knowledge; I rely heavily on professional advice." },
      { value: 2, label: "Some knowledge; I understand basic concepts and seek advice." },
      { value: 3, label: "Good knowledge; I understand most investment products and market trends." },
      { value: 4, label: "Extensive knowledge; I am confident in making my own investment decisions." },
    ]
  },
  {
    id: 6,
    category: "Market Experience",
    text: "During the 2008 financial crisis or COVID-19 market decline, how did you react?",
    options: [
      { value: 1, label: "I sold most investments to avoid further losses or wasn't invested." },
      { value: 2, label: "I reduced my equity allocation and moved to safer investments." },
      { value: 3, label: "I held my investments and waited for the market to recover." },
      { value: 4, label: "I increased my investments, viewing it as a buying opportunity." },
    ]
  },
  {
    id: 7,
    category: "Liquidity Needs",
    text: "How important is it to have easy access to your invested money?",
    options: [
      { value: 1, label: "Very important - I need to be able to access funds quickly without penalty." },
      { value: 2, label: "Somewhat important - I may need access within 1-2 years." },
      { value: 3, label: "Not very important - I don't expect to need this money for several years." },
      { value: 4, label: "Not important - This money is for long-term goals only." },
    ]
  },
  {
    id: 8,
    category: "Income Stability",
    text: "How stable is your current income and employment situation?",
    options: [
      { value: 1, label: "Unstable - irregular income or uncertain employment." },
      { value: 2, label: "Somewhat stable - steady job but some income variability." },
      { value: 3, label: "Stable - secure employment with predictable income." },
      { value: 4, label: "Very stable - multiple income sources or very secure position." },
    ]
  },
  {
    id: 9,
    category: "Investment Options",
    text: "Which of the following investment options appeals to you most?",
    options: [
      { value: 1, label: "Government bonds and GICs - guaranteed returns with minimal risk." },
      { value: 2, label: "Balanced mutual funds - moderate growth with some stability." },
      { value: 3, label: "Growth-oriented equity funds - higher potential returns with more volatility." },
      { value: 4, label: "Individual stocks or sector ETFs - maximum growth potential with high risk." },
    ]
  },
  {
    id: 10,
    category: "Loss Tolerance",
    text: "What is the maximum portfolio decline you could tolerate in any given year?",
    options: [
      { value: 1, label: "5% or less - I need very stable returns." },
      { value: 2, label: "5-15% - I can handle moderate fluctuations." },
      { value: 3, label: "15-25% - I can accept significant short-term losses for long-term gains." },
      { value: 4, label: "25% or more - I understand high returns require accepting high volatility." },
    ]
  },
  {
    id: 11,
    category: "Emergency Preparedness",
    text: "Do you have an adequate emergency fund (3-6 months expenses) separate from your investments?",
    options: [
      { value: 1, label: "No - I would need to access investments for emergencies." },
      { value: 2, label: "Partially - I have some emergency savings but may need investment access." },
      { value: 3, label: "Yes - I have adequate emergency funds for most situations." },
      { value: 4, label: "Yes - I have substantial emergency reserves beyond basic needs." },
    ]
  },
  {
    id: 12,
    category: "Return Expectations",
    text: "What annual return do you expect from your investments over the long term?",
    options: [
      { value: 1, label: "2-4% - I prioritize capital preservation over growth." },
      { value: 2, label: "4-7% - I want steady, moderate growth." },
      { value: 3, label: "7-10% - I'm willing to accept volatility for good returns." },
      { value: 4, label: "10%+ - I want maximum growth potential despite high risk." },
    ]
  },
];

export default function RiskQuestionnaire({ onComplete, isSubmitting }) {
  const [answers, setAnswers] = useState({});
  const [isAttempted, setIsAttempted] = useState(false);

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: parseInt(value) }));
  };

  const handleSubmit = () => {
    setIsAttempted(true);
    const answeredQuestions = Object.keys(answers).length;
    if (answeredQuestions < questions.length) {
      alert("Please answer all questions before submitting.");
      return;
    }

    const totalScore = Object.values(answers).reduce((sum, score) => sum + score, 0);
    onComplete(answers, totalScore);
  };

  // Group questions by category for better organization
  const questionsByCategory = questions.reduce((acc, question) => {
    if (!acc[question.category]) {
      acc[question.category] = [];
    }
    acc[question.category].push(question);
    return acc;
  }, {});

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Step 2: Complete the Risk Assessment Questionnaire</CardTitle>
        <CardDescription>
          Please answer all questions honestly to determine your appropriate risk tolerance and investment profile. 
          This comprehensive assessment will help create a personalized investment strategy.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {Object.entries(questionsByCategory).map(([category, categoryQuestions], categoryIndex) => (
          <div key={category} className="space-y-6">
            {categoryIndex > 0 && <Separator className="my-8" />}
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="font-semibold text-slate-800 text-lg mb-1">{category}</h3>
              <p className="text-sm text-slate-600">Questions {categoryQuestions[0].id}-{categoryQuestions[categoryQuestions.length - 1].id} of {questions.length}</p>
            </div>
            
            {categoryQuestions.map(q => (
              <div key={q.id} className="space-y-4 p-4 border rounded-lg bg-white">
                <Label className="font-semibold text-slate-800 text-base block mb-3">
                  {q.id}. {q.text}
                  {isAttempted && !answers[q.id] && (
                    <span className="text-red-500 text-sm ml-2">* Required</span>
                  )}
                </Label>
                <RadioGroup
                  onValueChange={(value) => handleAnswerChange(q.id, value)}
                  value={answers[q.id] ? answers[q.id].toString() : ""}
                >
                  {q.options.map(option => (
                    <div key={option.value} className="flex items-start space-x-3 p-3 border rounded-md hover:bg-slate-50 transition-colors">
                      <RadioGroupItem 
                        value={option.value.toString()} 
                        id={`q${q.id}-opt${option.value}`} 
                        className="mt-1"
                      />
                      <Label 
                        htmlFor={`q${q.id}-opt${option.value}`} 
                        className="text-base cursor-pointer leading-relaxed flex-1"
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))}
          </div>
        ))}
        
        <div className="pt-6 border-t">
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <p className="text-sm text-blue-800">
              <strong>Assessment Scoring:</strong> Your answers will be scored to determine your risk profile. 
              Scores range from {questions.length} (most conservative) to {questions.length * 4} (most aggressive). 
              This will help determine an appropriate asset allocation for your investment goals.
            </p>
          </div>
          
          <div className="flex justify-center">
            <Button onClick={handleSubmit} disabled={isSubmitting} size="lg" className="px-8">
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Complete Risk Assessment
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
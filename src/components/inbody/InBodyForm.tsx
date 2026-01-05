import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Scale, 
  Upload, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Camera
} from 'lucide-react';
import { format } from 'date-fns';
import { extractInBodyData, type InBodyOCRResult } from '@/services/ocr';
import type { InBodyInsert } from '@/hooks/useInBodyRecords';

interface InBodyFormProps {
  onSave: (record: InBodyInsert) => Promise<boolean>;
  isSaving: boolean;
}

interface FormData {
  date: string;
  weight_kg: string;
  skeletal_muscle_kg: string;
  body_fat_percentage: string;
}

interface ValidationErrors {
  weight_kg?: string;
  skeletal_muscle_kg?: string;
  body_fat_percentage?: string;
}

function validateForm(data: FormData): ValidationErrors {
  const errors: ValidationErrors = {};
  
  const weight = parseFloat(data.weight_kg);
  if (isNaN(weight) || weight < 20 || weight > 300) {
    errors.weight_kg = 'Weight must be between 20-300 kg';
  }
  
  const muscle = parseFloat(data.skeletal_muscle_kg);
  if (isNaN(muscle) || muscle <= 0) {
    errors.skeletal_muscle_kg = 'Muscle mass must be a positive number';
  }
  
  const fat = parseFloat(data.body_fat_percentage);
  if (isNaN(fat) || fat < 3 || fat > 60) {
    errors.body_fat_percentage = 'Body fat must be between 3-60%';
  }
  
  return errors;
}

export function InBodyForm({ onSave, isSaving }: InBodyFormProps) {
  const [formData, setFormData] = useState<FormData>({
    date: format(new Date(), 'yyyy-MM-dd'),
    weight_kg: '',
    skeletal_muscle_kg: '',
    body_fat_percentage: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<'idle' | 'success' | 'partial' | 'failed'>('idle');
  const [ocrResult, setOcrResult] = useState<InBodyOCRResult | null>(null);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const record: InBodyInsert = {
      date: formData.date,
      weight_kg: parseFloat(formData.weight_kg),
      skeletal_muscle_kg: parseFloat(formData.skeletal_muscle_kg),
      body_fat_percentage: parseFloat(formData.body_fat_percentage),
    };

    const success = await onSave(record);
    if (success) {
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        weight_kg: '',
        skeletal_muscle_kg: '',
        body_fat_percentage: '',
      });
      setOcrStatus('idle');
      setOcrResult(null);
    }
  };

  const handleFileUpload = useCallback(async (file: File) => {
    setIsProcessingOCR(true);
    setOcrStatus('idle');
    setOcrResult(null);

    try {
      const result = await extractInBodyData(file);
      setOcrResult(result);

      // Pre-fill form with extracted values
      const newFormData = { ...formData };
      let fieldsFound = 0;

      if (result.weight_kg !== null) {
        newFormData.weight_kg = result.weight_kg.toString();
        fieldsFound++;
      }
      if (result.skeletal_muscle_kg !== null) {
        newFormData.skeletal_muscle_kg = result.skeletal_muscle_kg.toString();
        fieldsFound++;
      }
      if (result.body_fat_percentage !== null) {
        newFormData.body_fat_percentage = result.body_fat_percentage.toString();
        fieldsFound++;
      }

      setFormData(newFormData);
      
      if (fieldsFound === 3) {
        setOcrStatus('success');
      } else if (fieldsFound > 0) {
        setOcrStatus('partial');
      } else {
        setOcrStatus('failed');
      }
    } catch (error) {
      console.error('OCR processing error:', error);
      setOcrStatus('failed');
    } finally {
      setIsProcessingOCR(false);
    }
  }, [formData]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-background border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          Add InBody Measurement
        </CardTitle>
        <CardDescription>
          Enter your body composition data manually or upload an InBody report
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Manual Entry
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Upload Report
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="date">Measurement Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    max={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    placeholder="e.g., 75.5"
                    value={formData.weight_kg}
                    onChange={(e) => handleInputChange('weight_kg', e.target.value)}
                    className={errors.weight_kg ? 'border-destructive' : ''}
                  />
                  {errors.weight_kg && (
                    <p className="text-xs text-destructive">{errors.weight_kg}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="muscle">Skeletal Muscle Mass (kg)</Label>
                  <Input
                    id="muscle"
                    type="number"
                    step="0.1"
                    placeholder="e.g., 32.5"
                    value={formData.skeletal_muscle_kg}
                    onChange={(e) => handleInputChange('skeletal_muscle_kg', e.target.value)}
                    className={errors.skeletal_muscle_kg ? 'border-destructive' : ''}
                  />
                  {errors.skeletal_muscle_kg && (
                    <p className="text-xs text-destructive">{errors.skeletal_muscle_kg}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fat">Body Fat Percentage (%)</Label>
                  <Input
                    id="fat"
                    type="number"
                    step="0.1"
                    placeholder="e.g., 18.5"
                    value={formData.body_fat_percentage}
                    onChange={(e) => handleInputChange('body_fat_percentage', e.target.value)}
                    className={errors.body_fat_percentage ? 'border-destructive' : ''}
                  />
                  {errors.body_fat_percentage && (
                    <p className="text-xs text-destructive">{errors.body_fat_percentage}</p>
                  )}
                </div>
              </div>
              <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Save Measurement
                  </>
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="upload">
            <div className="space-y-4">
              {/* Upload Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="relative border-2 border-dashed border-border/50 rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              >
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileInput}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isProcessingOCR}
                />
                {isProcessingOCR ? (
                  <div className="space-y-2">
                    <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Processing image...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="text-sm font-medium">Drop your InBody report here</p>
                    <p className="text-xs text-muted-foreground">or click to browse (PDF or image)</p>
                  </div>
                )}
              </div>

              {/* OCR Status */}
              {ocrStatus !== 'idle' && (
                <div className={`rounded-lg p-4 ${
                  ocrStatus === 'success' ? 'bg-green-500/10 border border-green-500/20' :
                  ocrStatus === 'partial' ? 'bg-yellow-500/10 border border-yellow-500/20' :
                  'bg-destructive/10 border border-destructive/20'
                }`}>
                  <div className="flex items-start gap-3">
                    {ocrStatus === 'success' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    ) : ocrStatus === 'partial' ? (
                      <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {ocrStatus === 'success' ? 'All values extracted successfully!' :
                         ocrStatus === 'partial' ? 'Some values extracted. Please review and complete.' :
                         'Could not extract values. Please enter manually.'}
                      </p>
                      {ocrResult && ocrStatus !== 'failed' && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Confidence: {Math.round(ocrResult.confidence * 100)}%
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Form after OCR */}
              {(ocrStatus === 'success' || ocrStatus === 'partial') && (
                <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-border/50">
                  <p className="text-sm text-muted-foreground">Review and confirm extracted values:</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="date-ocr">Measurement Date</Label>
                      <Input
                        id="date-ocr"
                        type="date"
                        value={formData.date}
                        onChange={(e) => handleInputChange('date', e.target.value)}
                        max={format(new Date(), 'yyyy-MM-dd')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weight-ocr">Weight (kg)</Label>
                      <Input
                        id="weight-ocr"
                        type="number"
                        step="0.1"
                        placeholder="e.g., 75.5"
                        value={formData.weight_kg}
                        onChange={(e) => handleInputChange('weight_kg', e.target.value)}
                        className={errors.weight_kg ? 'border-destructive' : ''}
                      />
                      {errors.weight_kg && (
                        <p className="text-xs text-destructive">{errors.weight_kg}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="muscle-ocr">Skeletal Muscle Mass (kg)</Label>
                      <Input
                        id="muscle-ocr"
                        type="number"
                        step="0.1"
                        placeholder="e.g., 32.5"
                        value={formData.skeletal_muscle_kg}
                        onChange={(e) => handleInputChange('skeletal_muscle_kg', e.target.value)}
                        className={errors.skeletal_muscle_kg ? 'border-destructive' : ''}
                      />
                      {errors.skeletal_muscle_kg && (
                        <p className="text-xs text-destructive">{errors.skeletal_muscle_kg}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fat-ocr">Body Fat Percentage (%)</Label>
                      <Input
                        id="fat-ocr"
                        type="number"
                        step="0.1"
                        placeholder="e.g., 18.5"
                        value={formData.body_fat_percentage}
                        onChange={(e) => handleInputChange('body_fat_percentage', e.target.value)}
                        className={errors.body_fat_percentage ? 'border-destructive' : ''}
                      />
                      {errors.body_fat_percentage && (
                        <p className="text-xs text-destructive">{errors.body_fat_percentage}</p>
                      )}
                    </div>
                  </div>
                  <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Confirm & Save
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

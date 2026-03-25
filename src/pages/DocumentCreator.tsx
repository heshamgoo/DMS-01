import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { cn } from '../utils/cn';
import { Document, DocumentStatus, ApprovalLog } from '../types';
import { ArrowLeft, Save, Send } from 'lucide-react';
import { Letterhead } from '../components/Letterhead';

export function DocumentCreator() {
  const navigate = useNavigate();
  const { templates, addDocument, documents, clients } = useStore();
  const { profile } = useAuthStore();
  const { settings } = useSettingsStore();
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [title, setTitle] = useState('');

  const filteredTemplates = selectedDepartment === 'All' 
    ? templates 
    : templates.filter(t => t.department === selectedDepartment);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  const generateSerialNumber = (prefix: string) => {
    const year = new Date().getFullYear();
    const typeDocs = documents.filter(d => d.serialNumber.startsWith(`${prefix}-${year}`));
    const count = typeDocs.length + 1;
    return `${prefix}-${year}-${count.toString().padStart(4, '0')}`;
  };

  const handleSave = async (status: DocumentStatus) => {
    if (!selectedTemplate) return;
    if (!title) return alert('Document title is required');
    if (!profile) return alert('You must be logged in to create a document');

    if (selectedTemplate.type === 'document') {
      // Basic validation for document fields
      for (const field of selectedTemplate.fields) {
        if (field.required && !formData[field.name]) {
          return alert(`${field.label} is required`);
        }
      }
    }

    const serialNumber = generateSerialNumber(selectedTemplate.prefix);
    const docId = `d${Date.now()}`;

    const initialLog: ApprovalLog = {
      id: `l${Date.now()}`,
      userId: profile.uid,
      action: status === 'Submitted' ? 'Submitted' : 'Submitted',
      timestamp: new Date().toISOString(),
      level: 0
    };

    const newDoc: Document = {
      id: docId,
      templateId: selectedTemplate.id,
      templateType: selectedTemplate.type,
      serialNumber,
      title,
      department: selectedTemplate.department,
      data: formData,
      status,
      creatorId: profile.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      logs: status === 'Submitted' ? [initialLog] : []
    };

    try {
      await addDocument(newDoc);
      navigate(`/documents/${docId}`);
    } catch (error) {
      console.error('Failed to save document:', error);
      alert('Failed to save document. Please try again.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/documents')} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create Document</h1>
            <p className="text-slate-500">Select a template and fill in the details.</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => handleSave('Draft')} disabled={!selectedTemplate}>
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          <Button onClick={() => handleSave('Submitted')} disabled={!selectedTemplate}>
            <Send className="w-4 h-4 mr-2" />
            Submit for Approval
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Document Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Department</label>
              <select
                value={selectedDepartment}
                onChange={(e) => {
                  setSelectedDepartment(e.target.value);
                  setSelectedTemplateId('');
                  setFormData({});
                }}
                className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="All">All Departments</option>
                {(settings?.departments || ['General', 'HR', 'Finance', 'Operation', 'Public']).map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Select Template <span className="text-red-500">*</span></label>
              <select
                value={selectedTemplateId}
                onChange={(e) => {
                  const tId = e.target.value;
                  setSelectedTemplateId(tId);
                  setFormData({});
                }}
                className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">-- Select a Template --</option>
                {filteredTemplates.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.prefix}) - Document</option>
                ))}
              </select>
            </div>
          </div>

          {selectedTemplate && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Document Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`e.g., ${selectedTemplate.name} - ${profile?.fullName || 'User'}`}
                className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTemplate && selectedTemplate.type === 'document' && (
        <div className="flex justify-center bg-slate-100 p-8 rounded-xl shadow-inner overflow-x-auto">
          <div className="bg-white shadow-lg" style={{ width: '210mm', height: '297mm' }}>
            <Letterhead fullPage>
              <div className="relative w-full h-full flex-1">
                {selectedTemplate.fields.map(field => (
                  <div 
                    key={field.id} 
                    className="absolute flex flex-col"
                    style={{
                      left: field.x || 0,
                      top: field.y || 0,
                      width: field.w || 200,
                      height: field.h || 60,
                      fontWeight: field.bold ? 'bold' : 'normal',
                      textAlign: field.align || 'left',
                      color: field.color || 'inherit'
                    }}
                  >
                    {field.type !== 'static-text' && (
                      <label 
                        className="text-sm font-semibold text-slate-700 flex items-center mb-1 shrink-0 print-hidden"
                        data-html2canvas-ignore="true"
                      >
                        {field.label} {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                    )}
                    
                    <div className="flex-1 w-full relative">
                      {field.type === 'static-text' && (
                        <div className="prose prose-sm max-w-none text-slate-800 whitespace-pre-wrap w-full h-full">
                          {field.content || ''}
                        </div>
                      )}

                      {field.type === 'table' && (
                        <table className="w-full h-full border-collapse border border-slate-300 table-fixed text-sm">
                          <colgroup>
                            {Array.from({ length: field.cols || 2 }).map((_, i) => (
                              <col key={i} style={{ width: field.colWidths?.[i] || 'auto' }} />
                            ))}
                          </colgroup>
                          <thead>
                            <tr className="bg-slate-50">
                              {Array.from({ length: field.cols || 2 }).map((_, i) => (
                                <th key={i} className="border border-slate-300 px-2 py-1 text-left font-medium text-slate-700 truncate">
                                  {field.options?.[i] || `Col ${i + 1}`}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from({ length: field.rows || 2 }).map((_, rowIndex) => {
                              const rowData = (formData[field.name] || [])[rowIndex] || {};
                              return (
                                <tr key={rowIndex} style={{ height: field.rowHeights?.[rowIndex] || 'auto' }}>
                                  {Array.from({ length: field.cols || 2 }).map((_, colIndex) => {
                                    const colName = field.options?.[colIndex] || `Col ${colIndex + 1}`;
                                    return (
                                      <td key={colIndex} className="border border-slate-300 p-0">
                                        <input
                                          type="text"
                                          value={rowData[colName] || ''}
                                          onChange={(e) => {
                                            const newTableData = [...(formData[field.name] || [])];
                                            if (!newTableData[rowIndex]) newTableData[rowIndex] = {};
                                            newTableData[rowIndex] = { ...newTableData[rowIndex], [colName]: e.target.value };
                                            setFormData({ ...formData, [field.name]: newTableData });
                                          }}
                                          className="w-full h-full p-2 border-none focus:ring-0 bg-transparent text-sm"
                                        />
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}

                      {field.type === 'text' && (
                        <input
                          type="text"
                          value={formData[field.name] || ''}
                          onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                          className="absolute inset-0 w-full h-full p-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                          required={field.required}
                        />
                      )}
                      
                      {field.type === 'textarea' && (
                        <textarea
                          value={formData[field.name] || ''}
                          onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                          className="absolute inset-0 w-full h-full p-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 bg-white resize-none"
                          required={field.required}
                        />
                      )}
                      
                      {field.type === 'number' && (
                        <input
                          type="number"
                          value={formData[field.name] || ''}
                          onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                          className="absolute inset-0 w-full h-full p-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                          required={field.required}
                        />
                      )}
                      
                      {field.type === 'date' && (
                        <input
                          type="date"
                          value={formData[field.name] || ''}
                          onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                          className="absolute inset-0 w-full h-full p-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                          required={field.required}
                        />
                      )}
                      
                      {field.type === 'dropdown' && (
                        <select
                          value={formData[field.name] || ''}
                          onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                          className="absolute inset-0 w-full h-full p-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                          required={field.required}
                        >
                          <option value="">-- Select --</option>
                          {field.options?.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )}
                      
                      {field.type === 'checkbox' && (
                        <label className="flex items-center space-x-2 h-full">
                          <input
                            type="checkbox"
                            checked={formData[field.name] || false}
                            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.checked })}
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                            required={field.required}
                          />
                          <span className="text-sm text-slate-700">Yes</span>
                        </label>
                      )}

                      {field.type === 'signature' && (
                        <div className="absolute inset-0 border-2 border-dashed border-slate-300 rounded-md bg-slate-50 flex items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-100 transition-colors">
                          <span className="text-sm">Click to sign</span>
                        </div>
                      )}

                      {field.type === 'system-serial' && (
                        <div className="absolute inset-0 border border-slate-200 rounded-md bg-slate-50 flex items-center px-3 text-slate-500 font-mono italic">
                          [Auto-Generated Serial]
                        </div>
                      )}

                      {field.type === 'system-date' && (
                        <div className="absolute inset-0 border border-slate-200 rounded-md bg-slate-50 flex items-center px-3 text-slate-500 font-mono">
                          {new Date().toLocaleDateString()}
                        </div>
                      )}

                      {field.type === 'client' && (
                        <div className="absolute inset-0 w-full h-full flex flex-col">
                          <select
                            value={formData[field.name]?.id || ''}
                            onChange={(e) => {
                              const selectedClient = clients.find(c => c.id === e.target.value);
                              setFormData({ ...formData, [field.name]: selectedClient || null });
                            }}
                            className="w-full p-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 bg-white mb-2 print:hidden"
                            required={field.required}
                          >
                            <option value="">-- Select Client --</option>
                            {clients.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                          {formData[field.name] ? (
                            <div className="flex-1 border border-slate-200 rounded-md p-3 bg-slate-50 text-sm overflow-y-auto print:border-none print:bg-transparent print:p-0">
                              <div className="font-bold text-slate-800 mb-1">{formData[field.name].name}</div>
                              {formData[field.name].address && <div className="text-slate-600">Address: {formData[field.name].address}</div>}
                              {formData[field.name].contactPerson && <div className="text-slate-600">Attn: {formData[field.name].contactPerson}</div>}
                              {formData[field.name].telPoBox && <div className="text-slate-600">Tel/P.O Box: {formData[field.name].telPoBox}</div>}
                              {formData[field.name].email && <div className="text-slate-600">Email: {formData[field.name].email}</div>}
                              {formData[field.name].trn && <div className="text-slate-600">TRN: {formData[field.name].trn}</div>}
                            </div>
                          ) : (
                            <div className="flex-1 border border-slate-200 rounded-md p-3 bg-slate-50 text-sm text-slate-400 flex items-center justify-center print:hidden">
                              No client selected
                            </div>
                          )}
                        </div>
                      )}

                      {field.type === 'image' && (
                        <div className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden">
                          {field.content ? (
                            <img src={field.content} alt="Logo" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300">
                              No Image
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Letterhead>
          </div>
        </div>
      )}
    </div>
  );
}

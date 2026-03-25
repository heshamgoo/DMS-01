import React, { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ArrowLeft, CheckCircle, XCircle, Download, Printer, History } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../utils/cn';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ApprovalLog, DocumentStatus } from '../types';

import { Letterhead } from '../components/Letterhead';

export function DocumentViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { documents, templates, updateDocumentStatus } = useStore();
  const { profile, isAdmin } = useAuthStore();
  const [comment, setComment] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  const document = documents.find(d => d.id === id);
  const template = templates.find(t => t.id === document?.templateId);
  const creatorName = document?.creatorId === profile?.uid ? profile?.fullName : 'User';

  if (!document || !template) {
    return <div className="p-6 text-red-500">Document not found.</div>;
  }

  const canApprove = () => {
    if (!profile) return false;
    if (document.status === 'Submitted' && profile.role === 'Manager') return true;
    if (document.status === 'Approved Level 1' && profile.role === 'Admin') return true;
    if (isAdmin && ['Submitted', 'Approved Level 1'].includes(document.status)) return true;
    return false;
  };

  const handleAction = async (action: 'Approved' | 'Rejected') => {
    if (!profile) return;
    
    let newStatus: DocumentStatus = document.status;
    let level = 1;

    if (action === 'Rejected') {
      newStatus = 'Rejected';
    } else {
      if (document.status === 'Submitted') {
        newStatus = 'Approved Level 1';
        level = 1;
      } else if (document.status === 'Approved Level 1') {
        newStatus = 'Final Approved';
        level = 2;
      }
    }

    const log: ApprovalLog = {
      id: `l${Date.now()}`,
      userId: profile.uid,
      action,
      comments: comment,
      timestamp: new Date().toISOString(),
      level
    };

    try {
      await updateDocumentStatus(document.id, newStatus, log);
      setComment('');
    } catch (error) {
      console.error('Failed to update document status:', error);
      alert('Failed to update document status. Please try again.');
    }
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const canvas = await html2canvas(printRef.current, { 
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: printRef.current.offsetWidth,
        height: printRef.current.offsetHeight
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${document.serialNumber}.pdf`);
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('Failed to generate PDF. Please try using the Print button instead.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 print:p-0 print:m-0 print:max-w-none print:bg-white">
      <div className="flex items-center justify-between print-hidden">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/documents')} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{document.serialNumber}</h1>
            <p className="text-slate-500">{document.title}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:block print:w-full">
        <div className="lg:col-span-2 space-y-6 print:w-full">
            <div className="mx-auto flex justify-center overflow-x-auto print:overflow-visible print:block print:p-0">
              <div 
                ref={printRef} 
                className="bg-white shadow-lg print:shadow-none print:m-0"
                style={{ width: '210mm', height: '297mm' }}
              >
                <Letterhead fullPage>
                <div className="relative w-full h-full flex-1">
                  {template.fields.map(field => {
                    const value = document.data[field.name];
                    
                    return (
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
                            {field.label}
                          </label>
                        )}
                        
                        <div className="flex-1 w-full relative">
                          {field.type === 'static-text' && (
                            <div className="prose prose-sm max-w-none text-slate-800 whitespace-pre-wrap w-full h-full">
                              {field.content || ''}
                            </div>
                          )}

                          {field.type === 'table' && (
                            <table className="w-full h-full border-collapse border border-slate-300 table-fixed text-sm bg-white">
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
                                  const rowData = (value || [])[rowIndex] || {};
                                  return (
                                    <tr key={rowIndex} style={{ height: field.rowHeights?.[rowIndex] || 'auto' }}>
                                      {Array.from({ length: field.cols || 2 }).map((_, colIndex) => {
                                        const colName = field.options?.[colIndex] || `Col ${colIndex + 1}`;
                                        return (
                                          <td key={colIndex} className="border border-slate-300 px-2 py-1">
                                            {rowData[colName] || ''}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}

                          {field.type === 'signature' && (
                            <div className="absolute inset-0 border-b-2 border-slate-800 flex items-end justify-center pb-2 bg-white">
                              {value ? (
                                <span className="font-signature text-2xl text-slate-800">{value}</span>
                              ) : (
                                <span className="text-slate-300 italic text-sm">Not signed</span>
                              )}
                            </div>
                          )}

                          {field.type === 'system-serial' && (
                            <div className="absolute inset-0 w-full h-full p-2 text-sm bg-transparent font-mono flex items-center">
                              {document.serialNumber}
                            </div>
                          )}

                          {field.type === 'system-date' && (
                            <div className="absolute inset-0 w-full h-full p-2 text-sm bg-transparent font-mono flex items-center">
                              {format(new Date(document.createdAt), 'dd/MM/yyyy')}
                            </div>
                          )}

                          {field.type === 'image' && (
                            <div className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden">
                              {field.content && (
                                <img src={field.content} alt="Logo" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                              )}
                            </div>
                          )}

                          {field.type === 'client' && value && (
                            <div className="absolute inset-0 w-full h-full p-2 text-sm bg-transparent overflow-hidden flex flex-col">
                              <div className="font-bold text-slate-800 mb-1">{value.name}</div>
                              {value.address && <div className="text-slate-600">Address: {value.address}</div>}
                              {value.contactPerson && <div className="text-slate-600">Attn: {value.contactPerson}</div>}
                              {value.telPoBox && <div className="text-slate-600">Tel/P.O Box: {value.telPoBox}</div>}
                              {value.email && <div className="text-slate-600">Email: {value.email}</div>}
                              {value.trn && <div className="text-slate-600">TRN: {value.trn}</div>}
                            </div>
                          )}

                          {field.type !== 'static-text' && field.type !== 'table' && field.type !== 'signature' && field.type !== 'system-serial' && field.type !== 'system-date' && field.type !== 'image' && field.type !== 'client' && (
                            <div className="absolute inset-0 w-full h-full p-2 text-sm bg-transparent overflow-hidden">
                              {field.type === 'checkbox' ? (value ? 'Yes' : 'No') : (value || '')}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Letterhead>
              </div>
            </div>
        </div>

        <div className="space-y-6 print-hidden">
          <Card>
            <CardHeader>
              <CardTitle>Status & Workflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-3">
                <span className={cn(
                  "px-3 py-1 text-sm font-medium rounded-full",
                  document.status === 'Final Approved' ? 'bg-emerald-100 text-emerald-700' :
                  document.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                  document.status === 'Draft' ? 'bg-slate-100 text-slate-700' :
                  'bg-amber-100 text-amber-700'
                )}>
                  {document.status}
                </span>
              </div>

              {canApprove() && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Add Comment (Optional)</label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 h-20"
                      placeholder="Reason for approval/rejection..."
                    />
                  </div>
                  <div className="flex space-x-3">
                    <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleAction('Approved')}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button variant="danger" className="flex-1" onClick={() => handleAction('Rejected')}>
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

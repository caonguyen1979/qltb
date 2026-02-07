import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, Trash2, Printer, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { db } from '../services/mockDatabase';
import { Device, DeviceStatus, Role, DeviceLog } from '../types';
import { useAuth } from '../context/AuthContext';
import { QRCodeWrapper } from '../components/QRCodeWrapper';
import { v4 as uuidv4 } from 'uuid';

export const DeviceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Determine if we start in edit mode based on URL or logic
  useEffect(() => {
    const init = async () => {
        const isNew = id === 'new';
        const isEditMode = searchParams.get('edit') === 'true';
        const isQRMode = searchParams.get('qr') === 'true';

        if (isNew) {
            setIsEditing(true);
            setDevice({
                id: uuidv4(),
                name: '',
                code: `EQ-${Math.floor(Math.random() * 10000)}`,
                category: 'General',
                status: DeviceStatus.AVAILABLE,
                location: '',
                purchaseDate: new Date().toISOString().split('T')[0],
                history: [],
                imageUrl: 'https://picsum.photos/200/200'
            });
            setLoading(false);
        } else {
            const found = await db.getDeviceById(id || '');
            if (found) {
                setDevice(found);
                setIsEditing(isEditMode);
                setShowQR(isQRMode);
            } else {
                navigate('/devices');
            }
            setLoading(false);
        }
    };
    init();
  }, [id, searchParams, navigate]);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<Device>();

  // Sync form with device state when loaded
  useEffect(() => {
    if (device) {
      setValue('name', device.name);
      setValue('code', device.code);
      setValue('category', device.category);
      setValue('status', device.status);
      setValue('location', device.location);
      setValue('purchaseDate', device.purchaseDate);
      setValue('description', device.description);
    }
  }, [device, setValue]);

  const onSubmit = async (data: Device) => {
    if (!device || !user) return;
    setSaving(true);

    try {
        // Create history log
        const changes: DeviceLog = {
            id: uuidv4(),
            date: new Date().toISOString(),
            action: id === 'new' ? 'CREATED' : 'UPDATED',
            performedBy: user.username,
            notes: `Status: ${data.status}`
        };

        const updatedDevice: Device = {
            ...device,
            ...data,
            history: [changes, ...device.history]
        };

        await db.saveDevice(updatedDevice);
        setDevice(updatedDevice);
        setIsEditing(false);
        alert('Device saved successfully!');
        if (id === 'new') navigate(`/devices/${updatedDevice.id}`);
    } catch (e) {
        alert('Failed to save device');
    } finally {
        setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: DeviceStatus) => {
    if (!device || !user) return;
    setSaving(true);
    
    try {
        const log: DeviceLog = {
            id: uuidv4(),
            date: new Date().toISOString(),
            action: 'STATUS_CHANGE',
            performedBy: user.username,
            notes: `Changed from ${device.status} to ${newStatus}`
        };

        const updated = { 
            ...device, 
            status: newStatus,
            history: [log, ...device.history]
        };
        
        await db.saveDevice(updated);
        setDevice(updated);
    } catch (e) {
        alert("Failed to update status");
    } finally {
        setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this device? This cannot be undone.')) {
      if (device) {
          setSaving(true);
          await db.deleteDevice(device.id);
          navigate('/devices');
      }
    }
  };

  const printQR = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && device) {
      printWindow.document.write(`
        <html>
          <head><title>Print QR - ${device.code}</title></head>
          <body style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif;">
            <h1>${device.name}</h1>
            <p>${device.code}</p>
            <div id="qr-target"></div>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
            <script>
              new QRCode(document.getElementById("qr-target"), {
                text: "${window.location.origin}/#/devices/${device.id}",
                width: 256,
                height: 256
              });
              setTimeout(() => window.print(), 500);
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const canEdit = user?.role === Role.ADMIN || user?.role === Role.MANAGER;
  const canDelete = user?.role === Role.ADMIN;
  const isUserAssigned = device?.assignedTo === user?.id;

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-600"/></div>;
  if (!device) return <div>Device not found.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/devices')}
          className="flex items-center text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
        </button>
        
        <div className="flex items-center space-x-3">
          {!isEditing && (
             <button 
               onClick={() => setShowQR(!showQR)}
               className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
             >
               <Printer className="w-4 h-4 mr-2" /> {showQR ? 'Hide QR' : 'Show QR'}
             </button>
          )}
          {!isEditing && canEdit && (
            <button 
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Edit Device
            </button>
          )}
          {!isEditing && canDelete && (
            <button 
              onClick={handleDelete}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* QR Code Section */}
      {showQR && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-100 flex flex-col items-center justify-center animate-fade-in">
          <h3 className="text-lg font-bold mb-4">Scan to manage this device</h3>
          <QRCodeWrapper value={`${window.location.origin}/#/devices/${device.id}`} size={200} />
          <p className="mt-4 text-sm text-gray-500">Code: {device.code}</p>
          <button 
            onClick={printQR}
            className="mt-4 text-blue-600 hover:underline text-sm"
          >
            Print Label
          </button>
        </div>
      )}

      {/* Main Content Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
        {saving && (
            <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
            </div>
        )}
        <div className="p-6 md:p-8 space-y-6">
          
          {/* Quick Status Actions for Standard Users/Managers */}
          {!isEditing && (
            <div className="flex flex-wrap gap-3 pb-6 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-500 w-full mb-1">Quick Actions:</span>
              <button 
                type="button"
                onClick={() => handleStatusChange(DeviceStatus.BROKEN)}
                disabled={saving}
                className="flex items-center px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 border border-red-200 transition-colors"
              >
                <AlertTriangle className="w-4 h-4 mr-2" /> Report Broken
              </button>
              {(canEdit || isUserAssigned) && device.status === DeviceStatus.BROKEN && (
                <button 
                  type="button"
                  onClick={() => handleStatusChange(DeviceStatus.MAINTENANCE)}
                  disabled={saving}
                  className="flex items-center px-4 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 border border-amber-200 transition-colors"
                >
                   Send to Maintenance
                </button>
              )}
               {(canEdit || isUserAssigned) && (device.status === DeviceStatus.MAINTENANCE || device.status === DeviceStatus.BROKEN) && (
                <button 
                  type="button"
                  onClick={() => handleStatusChange(DeviceStatus.AVAILABLE)}
                  disabled={saving}
                  className="flex items-center px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 border border-green-200 transition-colors"
                >
                   <CheckCircle className="w-4 h-4 mr-2" /> Mark Fixed / Available
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Device Name</label>
              <input 
                {...register('name', { required: true })}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg disabled:bg-gray-50 disabled:text-gray-500"
              />
              {errors.name && <span className="text-red-500 text-xs">Required</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Asset Code</label>
              <input 
                {...register('code', { required: true })}
                disabled={!isEditing} // Code usually shouldn't change, but allowing for now
                className="w-full px-4 py-2 border border-gray-200 rounded-lg disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select 
                {...register('category')}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="Electronics">Electronics</option>
                <option value="Furniture">Furniture</option>
                <option value="Laboratory">Laboratory</option>
                <option value="IT">IT</option>
                <option value="General">General</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select 
                {...register('status')}
                disabled={!isEditing && !canEdit}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg disabled:bg-gray-50 disabled:text-gray-500"
              >
                 {Object.values(DeviceStatus).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input 
                {...register('location')}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
              <input 
                type="date"
                {...register('purchaseDate')}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Description / Specs</label>
             <textarea 
                {...register('description')}
                disabled={!isEditing}
                rows={3}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg disabled:bg-gray-50 disabled:text-gray-500"
             />
          </div>

          {isEditing && (
            <div className="flex justify-end pt-4">
              <button 
                type="button"
                onClick={() => {
                  if (id === 'new') navigate('/devices');
                  else setIsEditing(false);
                }}
                className="mr-3 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={saving}
                className="flex items-center px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm"
              >
                <Save className="w-4 h-4 mr-2" /> Save Changes
              </button>
            </div>
          )}
        </div>
      </form>

      {/* History Log */}
      {!isEditing && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Log</h3>
          <div className="flow-root">
            <ul className="-mb-8">
              {device.history.map((log, idx) => (
                <li key={log.id}>
                  <div className="relative pb-8">
                    {idx !== device.history.length - 1 && (
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                    )}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                          <span className="text-white text-xs font-bold">{log.performedBy.charAt(0).toUpperCase()}</span>
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-500">
                            {log.action} <span className="font-medium text-gray-900">by {log.performedBy}</span>
                          </p>
                          {log.notes && <p className="text-sm text-gray-500 mt-1 italic">"{log.notes}"</p>}
                        </div>
                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                          {new Date(log.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
              {device.history.length === 0 && (
                <p className="text-gray-500 italic text-sm">No history available.</p>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
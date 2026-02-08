import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, Trash2, Printer, AlertTriangle, CheckCircle, Loader2, UserMinus, UserPlus, Camera, Upload, LogIn, ImagePlus } from 'lucide-react';
import { db } from '../services/mockDatabase';
import { Device, DeviceStatus, Role, DeviceLog, SystemConfig } from '../types';
import { useAuth } from '../context/AuthContext';
import { QRCodeWrapper } from '../components/QRCodeWrapper';
import { v4 as uuidv4 } from 'uuid';

export const DeviceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  
  const [device, setDevice] = useState<Device | null>(null);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Image Upload State
  const [reportImage, setReportImage] = useState<string | null>(null);
  const [deviceMainImage, setDeviceMainImage] = useState<string | null>(null);
  
  const reportFileInputRef = useRef<HTMLInputElement>(null);
  const mainImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
        const [foundDevice, sysConfig] = await Promise.all([
             id === 'new' ? null : db.getDeviceById(id || ''),
             db.getConfig()
        ]);

        setConfig(sysConfig);

        const isNew = id === 'new';
        const isEditMode = searchParams.get('edit') === 'true';
        const isQRMode = searchParams.get('qr') === 'true';

        if (isNew) {
            setIsEditing(true);
            setDevice({
                id: uuidv4(),
                name: '',
                code: `EQ-${Math.floor(Math.random() * 10000)}`,
                category: sysConfig.categories[0] || 'Khác',
                status: DeviceStatus.AVAILABLE,
                location: '',
                purchaseDate: new Date().toISOString().split('T')[0],
                history: [],
                imageUrl: '',
                customFields: {}
            });
            setLoading(false);
        } else {
            if (foundDevice) {
                setDevice(foundDevice);
                setDeviceMainImage(foundDevice.imageUrl || null);
                setIsEditing(isEditMode);
                setShowQR(isQRMode);
            } else {
                if (isAuthenticated) navigate('/devices');
            }
            setLoading(false);
        }
    };
    init();
  }, [id, searchParams, navigate, isAuthenticated]);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<Device>();

  useEffect(() => {
    if (device) {
      setValue('name', device.name);
      setValue('code', device.code);
      setValue('category', device.category);
      setValue('status', device.status);
      setValue('location', device.location);
      setValue('purchaseDate', device.purchaseDate);
      setValue('description', device.description);
      // Set dynamic fields
      if (device.customFields && config) {
          config.customFields.forEach(field => {
             setValue(`customFields.${field.key}` as any, device.customFields![field.key]); 
          });
      }
    }
  }, [device, setValue, config]);

  // --- IMAGE HANDLING HELPER ---
  const processImage = (file: File, callback: (base64: string) => void) => {
      const reader = new FileReader();
      reader.onloadend = () => {
          const img = new Image();
          img.src = reader.result as string;
          img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 800;
              const scale = MAX_WIDTH / img.width;
              canvas.width = MAX_WIDTH;
              canvas.height = img.height * scale;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
              // Compression 0.7
              const compressed = canvas.toDataURL('image/jpeg', 0.7);
              callback(compressed);
          };
      };
      reader.readAsDataURL(file);
  };

  const handleReportImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processImage(file, setReportImage);
  };

  const handleMainImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processImage(file, setDeviceMainImage);
  };

  const onSubmit = async (data: Device) => {
    if (!device || !user) return;
    setSaving(true);

    try {
        const changes: DeviceLog = {
            id: uuidv4(),
            date: new Date().toISOString(),
            action: id === 'new' ? 'TẠO MỚI' : 'CẬP NHẬT',
            performedBy: user.fullName,
            notes: `Trạng thái: ${data.status}`
        };

        const updatedDevice: Device = {
            ...device,
            ...data,
            imageUrl: deviceMainImage || device.imageUrl, // Save main image
            history: [changes, ...device.history]
        };

        await db.saveDevice(updatedDevice);
        setDevice(updatedDevice);
        setIsEditing(false);
        alert('Lưu thành công!');
        if (id === 'new') navigate(`/devices/${updatedDevice.id}`);
    } catch (e) {
        alert('Lỗi khi lưu thiết bị');
    } finally {
        setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: DeviceStatus, actionNote: string) => {
    if (!device || !user) return;
    setSaving(true);
    
    try {
        const log: DeviceLog = {
            id: uuidv4(),
            date: new Date().toISOString(),
            action: actionNote.toUpperCase(),
            performedBy: user.fullName,
            notes: `Chuyển trạng thái sang ${newStatus}`,
            reportImageUrl: reportImage || undefined // Add report image
        };

        const updated = { 
            ...device, 
            status: newStatus,
            history: [log, ...device.history]
        };
        
        await db.saveDevice(updated);
        setDevice(updated);
        setReportImage(null); 
    } catch (e) {
        alert("Lỗi khi cập nhật trạng thái");
    } finally {
        setSaving(false);
    }
  };

  // --- ACTIONS WITH AUTH CHECK ---
  const requireAuthAndAction = (callback: () => void) => {
      if (!isAuthenticated) {
          // Send user to login, and tell login page to come back here afterwards
          navigate('/login', { state: { from: location } });
      } else {
          callback();
      }
  };

  const handleBorrow = () => {
      requireAuthAndAction(async () => {
        if (!device || !user) return;
        if (device.status !== DeviceStatus.AVAILABLE) {
            alert("Thiết bị không sẵn sàng để mượn.");
            return;
        }
        setSaving(true);
        try {
            const log: DeviceLog = {
                id: uuidv4(),
                date: new Date().toISOString(),
                action: 'MƯỢN THIẾT BỊ',
                performedBy: user.fullName,
                notes: `Người mượn: ${user.fullName} (${user.username})`,
                reportImageUrl: reportImage || undefined
            };

            const updated: Device = {
                ...device,
                status: DeviceStatus.IN_USE,
                assignedTo: user.id,
                history: [log, ...device.history]
            };
            await db.saveDevice(updated);
            setDevice(updated);
            setReportImage(null);
        } catch(e) {
            alert("Lỗi khi đăng ký mượn.");
        } finally {
            setSaving(false);
        }
      });
  };

  const handleReturn = () => {
    requireAuthAndAction(async () => {
        if (!device || !user) return;
        setSaving(true);
        try {
            const log: DeviceLog = {
                id: uuidv4(),
                date: new Date().toISOString(),
                action: 'TRẢ THIẾT BỊ',
                performedBy: user.fullName,
                notes: `Đã trả lại kho.`,
                reportImageUrl: reportImage || undefined
            };

            const updated: Device = {
                ...device,
                status: DeviceStatus.AVAILABLE,
                assignedTo: undefined,
                history: [log, ...device.history]
            };
            await db.saveDevice(updated);
            setDevice(updated);
            setReportImage(null);
        } catch(e) {
            alert("Lỗi khi trả thiết bị.");
        } finally {
            setSaving(false);
        }
    });
  };

  const handleDelete = async () => {
    if (confirm('Bạn có chắc chắn muốn xóa thiết bị này?')) {
      if (device) {
          setSaving(true);
          await db.deleteDevice(device.id);
          navigate('/devices');
      }
    }
  };

  // --- PUBLIC POPUP VIEW ---
  if (!loading && device && !isAuthenticated) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
                <div className="bg-slate-900 p-6 text-white text-center shrink-0">
                    <h2 className="text-xl font-bold">{device.name}</h2>
                    <p className="opacity-80 text-sm mt-1">{device.code}</p>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto">
                     {/* Image in Popup */}
                     {device.imageUrl && (
                         <div className="w-full h-40 bg-gray-100 rounded-lg overflow-hidden mb-4">
                             <img src={device.imageUrl} alt={device.name} className="w-full h-full object-contain" />
                         </div>
                     )}

                     <div className="grid grid-cols-2 gap-4 text-sm">
                         <div>
                             <p className="text-gray-500">Trạng thái</p>
                             <p className="font-semibold text-gray-900">{device.status}</p>
                         </div>
                         <div>
                             <p className="text-gray-500">Vị trí</p>
                             <p className="font-semibold text-gray-900">{device.location}</p>
                         </div>
                         <div>
                             <p className="text-gray-500">Danh mục</p>
                             <p className="font-semibold text-gray-900">{device.category}</p>
                         </div>
                         
                         {/* Render Dynamic Fields in Popup */}
                         {config?.customFields.map(field => (
                             <div key={field.key}>
                                 <p className="text-gray-500">{field.label}</p>
                                 <p className="font-semibold text-gray-900">
                                     {device.customFields?.[field.key] || '-'}
                                 </p>
                             </div>
                         ))}
                     </div>
                     
                     <div className="border-t border-gray-100 pt-4 space-y-3">
                         <p className="text-center text-sm text-gray-500 mb-2">Bạn muốn thực hiện thao tác?</p>
                         
                         {device.status === DeviceStatus.AVAILABLE && (
                             <button onClick={handleBorrow} className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
                                 Đăng ký mượn
                             </button>
                         )}
                         
                         <button onClick={() => requireAuthAndAction(() => {})} className="w-full py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg font-medium hover:bg-amber-100">
                             Báo cáo tình trạng
                         </button>
                         
                         <button onClick={() => navigate('/login', { state: { from: location } })} className="w-full flex items-center justify-center py-2 text-gray-600 hover:text-gray-900">
                            <LogIn className="w-4 h-4 mr-2" /> Đăng nhập để xem chi tiết
                         </button>
                     </div>
                </div>
            </div>
        </div>
      );
  }

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-600"/></div>;
  if (!device) return <div>Không tìm thấy thiết bị.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/devices')}
          className="flex items-center text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại
        </button>
        
        <div className="flex items-center space-x-3">
          {!isEditing && (
             <button 
               onClick={() => setShowQR(!showQR)}
               className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
             >
               <Printer className="w-4 h-4 mr-2" /> {showQR ? 'Ẩn QR' : 'Hiện QR'}
             </button>
          )}
          {!isEditing && (user?.role === Role.ADMIN || user?.role === Role.MANAGER) && (
            <button 
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Sửa thông tin
            </button>
          )}
          {!isEditing && user?.role === Role.ADMIN && (
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
          <QRCodeWrapper value={`${window.location.origin}/#/devices/${device.id}`} size={200} />
          <p className="mt-4 text-sm text-gray-500">Mã: {device.code}</p>
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
          
          {/* Quick Actions Bar */}
          {!isEditing && (
            <div className="pb-6 border-b border-gray-100 space-y-4">
              <span className="text-sm font-semibold text-gray-500 w-full">Tác vụ nhanh:</span>
              
              <div className="flex flex-wrap gap-3">
                {/* Status Report Image Upload */}
                <div className="flex items-center space-x-2">
                    <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        ref={reportFileInputRef}
                        onChange={handleReportImageUpload}
                    />
                    <button 
                        type="button" 
                        onClick={() => reportFileInputRef.current?.click()}
                        className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${reportImage ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
                    >
                        {reportImage ? <CheckCircle className="w-4 h-4 mr-2" /> : <Camera className="w-4 h-4 mr-2" />}
                        {reportImage ? 'Đã có ảnh' : 'Chụp/Tải ảnh báo cáo'}
                    </button>
                </div>

                {/* Borrow / Return Logic */}
                {device.status === DeviceStatus.AVAILABLE && (
                    <button
                        type="button"
                        onClick={handleBorrow}
                        disabled={saving}
                        className="flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 border border-blue-200 transition-colors"
                    >
                        <UserPlus className="w-4 h-4 mr-2" /> Đăng ký Mượn
                    </button>
                )}

                {device.status === DeviceStatus.IN_USE && (
                    <button
                        type="button"
                        onClick={handleReturn}
                        disabled={saving}
                        className="flex items-center px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 border border-green-200 transition-colors"
                    >
                        <UserMinus className="w-4 h-4 mr-2" /> Trả thiết bị
                    </button>
                )}

                <button 
                    type="button"
                    onClick={() => handleStatusChange(DeviceStatus.BROKEN, "BÁO HỎNG")}
                    disabled={saving}
                    className="flex items-center px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 border border-red-200 transition-colors"
                >
                    <AlertTriangle className="w-4 h-4 mr-2" /> Báo hỏng / Mất
                </button>
                
                {(user?.role === Role.ADMIN) && device.status === DeviceStatus.BROKEN && (
                    <button 
                    type="button"
                    onClick={() => handleStatusChange(DeviceStatus.MAINTENANCE, "GỬI BẢO TRÌ")}
                    disabled={saving}
                    className="flex items-center px-4 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 border border-amber-200 transition-colors"
                    >
                    Gửi bảo trì
                    </button>
                )}
                {(user?.role === Role.ADMIN) && (device.status === DeviceStatus.MAINTENANCE || device.status === DeviceStatus.BROKEN) && (
                    <button 
                    type="button"
                    onClick={() => handleStatusChange(DeviceStatus.AVAILABLE, "HOÀN THÀNH SỬA CHỮA")}
                    disabled={saving}
                    className="flex items-center px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 border border-green-200 transition-colors"
                    >
                    <CheckCircle className="w-4 h-4 mr-2" /> Đã sửa xong
                    </button>
                )}
              </div>
              {reportImage && <div className="text-xs text-green-600">Đã đính kèm ảnh cho hành động tiếp theo.</div>}
            </div>
          )}

          {/* MAIN FORM */}
          <div className="flex flex-col md:flex-row gap-6">
            
            {/* Main Device Image & Upload */}
            <div className="w-full md:w-1/3 flex flex-col items-center space-y-3">
                <div 
                    onClick={() => isEditing && mainImageInputRef.current?.click()}
                    className={`relative w-48 h-48 bg-gray-100 rounded-xl overflow-hidden border-2 ${isEditing ? 'border-dashed border-blue-300 cursor-pointer hover:bg-blue-50' : 'border-gray-200'}`}
                >
                    {deviceMainImage ? (
                        <img src={deviceMainImage} alt="Device" className="w-full h-full object-cover" />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <ImagePlus className="w-8 h-8 mb-2" />
                            <span className="text-xs">Chưa có ảnh</span>
                        </div>
                    )}
                    {isEditing && (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                             <Camera className="w-8 h-8 text-white" />
                        </div>
                    )}
                </div>
                {isEditing && (
                    <div className="text-center">
                        <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            ref={mainImageInputRef}
                            onChange={handleMainImageUpload}
                        />
                         <button type="button" onClick={() => mainImageInputRef.current?.click()} className="text-sm text-blue-600 hover:underline">
                            Thay đổi ảnh
                        </button>
                    </div>
                )}
            </div>

            {/* Inputs */}
            <div className="w-full md:w-2/3 grid grid-cols-1 gap-6">
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên thiết bị</label>
                <input 
                    {...register('name', { required: true })}
                    disabled={!isEditing}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg disabled:bg-gray-50 disabled:text-gray-500"
                />
                {errors.name && <span className="text-red-500 text-xs">Bắt buộc</span>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mã tài sản</label>
                    <input 
                        {...register('code', { required: true })}
                        disabled={!isEditing}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg disabled:bg-gray-50 disabled:text-gray-500"
                    />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
                    <select 
                        {...register('category')}
                        disabled={!isEditing}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg disabled:bg-gray-50 disabled:text-gray-500"
                    >
                        {config?.categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                    <select 
                        {...register('status')}
                        disabled={!isEditing && (user?.role !== Role.ADMIN && user?.role !== Role.MANAGER)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg disabled:bg-gray-50 disabled:text-gray-500"
                    >
                        <option value={DeviceStatus.AVAILABLE}>Sẵn sàng</option>
                        <option value={DeviceStatus.IN_USE}>Đang sử dụng</option>
                        <option value={DeviceStatus.BROKEN}>Hỏng / Mất</option>
                        <option value={DeviceStatus.MAINTENANCE}>Bảo trì</option>
                    </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ngày mua</label>
                        <input 
                            type="date"
                            {...register('purchaseDate')}
                            disabled={!isEditing}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg disabled:bg-gray-50 disabled:text-gray-500"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vị trí lưu trữ</label>
                    <input 
                        {...register('location')}
                        disabled={!isEditing}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg disabled:bg-gray-50 disabled:text-gray-500"
                    />
                </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-50">
             {/* DYNAMIC FIELDS RENDER */}
             {config?.customFields.map((field) => (
                <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    {field.type === 'textarea' ? (
                        <textarea 
                            {...register(`customFields.${field.key}` as any, { required: field.required })}
                            disabled={!isEditing}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg disabled:bg-gray-50"
                        />
                    ) : field.type === 'select' ? (
                        <select 
                            {...register(`customFields.${field.key}` as any, { required: field.required })}
                            disabled={!isEditing}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg disabled:bg-gray-50"
                        >
                            <option value="">-- Chọn --</option>
                            {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    ) : (
                        <input 
                            type={field.type}
                            {...register(`customFields.${field.key}` as any, { required: field.required })}
                            disabled={!isEditing}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg disabled:bg-gray-50"
                        />
                    )}
                </div>
            ))}
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả / Cấu hình</label>
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
                Hủy bỏ
              </button>
              <button 
                type="submit"
                disabled={saving}
                className="flex items-center px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm"
              >
                <Save className="w-4 h-4 mr-2" /> Lưu thay đổi
              </button>
            </div>
          )}
        </div>
      </form>

      {/* History Log */}
      {!isEditing && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Lịch sử hoạt động</h3>
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
                      <div className="min-w-0 flex-1 pt-1.5 flex flex-col sm:flex-row justify-between sm:space-x-4 gap-2">
                        <div>
                          <p className="text-sm text-gray-500">
                            {log.action} <span className="font-medium text-gray-900">bởi {log.performedBy}</span>
                          </p>
                          {log.notes && <p className="text-sm text-gray-500 mt-1 italic">"{log.notes}"</p>}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-right text-sm whitespace-nowrap text-gray-500">
                                {new Date(log.date).toLocaleDateString()} {new Date(log.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                            {log.reportImageUrl && (
                                <a href={log.reportImageUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline flex items-center">
                                    <Camera className="w-3 h-3 mr-1" /> Xem ảnh
                                </a>
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { Checkbox } from "./ui/checkbox"
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet } from "./ui/field"
import { Input } from "./ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Textarea } from "./ui/textarea"
import { PaymentService } from "@/services/payment.service"

interface MembershipPaymentFormProps {
    membershipPlan: {
        id: string;
        name: string;
        price: number;
        description: string;
    };
    userId: string;
    userEmail: string;
    onPaymentSuccess: (paymentData: any) => void;
}

export const PaymentForm = ({ membershipPlan, userId, userEmail, onPaymentSuccess }: MembershipPaymentFormProps) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [detectedPaymentMethod, setDetectedPaymentMethod] = useState('visa');
    const [formData, setFormData] = useState({
        cardNumber: '',
        cardholderName: '',
        expirationMonth: '',
        expirationYear: '',
        securityCode: '',
        identificationType: 'DNI',
        identificationNumber: '',
        installments: 1,
        comments: ''
    });

    const handleInputChange = (field: string, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const formatCardNumber = (value: string) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        const matches = v.match(/\d{4,16}/g);
        const match = matches && matches[0] || '';
        const parts = [];
        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }
        return parts.length ? parts.join(' ') : v;
    };

    const handleCardNumberChange = (value: string) => {
        const formatted = formatCardNumber(value);
        const cleanNumber = formatted.replace(/\s/g, '');
        setFormData(prev => ({ ...prev, cardNumber: cleanNumber }));

        // Detectar método de pago cuando tenga suficientes dígitos
        if (cleanNumber.length >= 6) {
            const bin = cleanNumber.substring(0, 6);
            PaymentService.detectPaymentMethod(bin)
                .then(method => {
                    console.log('🔍 Método de pago detectado:', method);
                    setDetectedPaymentMethod(method);
                })
                .catch(err => console.warn('Error detectando método:', err));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);

        try {
            // 1️⃣ Crear token de tarjeta EN EL FRONTEND (seguro)
            console.log('🔒 Creando token de tarjeta en el navegador...');
            const cardToken = await PaymentService.createCardToken({
                cardNumber: formData.cardNumber,
                cardholderName: formData.cardholderName,
                cardExpirationMonth: formData.expirationMonth.padStart(2, '0'),
                cardExpirationYear: formData.expirationYear,
                securityCode: formData.securityCode,
                identificationType: formData.identificationType,
                identificationNumber: formData.identificationNumber
            });

            console.log('✅ Token creado:', cardToken.id);

            // 2️⃣ Enviar token al backend para procesar el pago
            console.log('💳 Procesando pago en el backend...');
            const externalReference = `MEMBERSHIP_${userId}_${Date.now()}`;

            const paymentResponse = await PaymentService.processDirectPayment({
                externalReference,
                amount: membershipPlan.price,
                payerEmail: userEmail,
                payerFirstName: formData.cardholderName.split(' ')[0],
                payerLastName: formData.cardholderName.split(' ').slice(1).join(' ') || 'N/A',
                description: `Membresía ${membershipPlan.name} - FitDesk`,
                token: cardToken.id,
                installments: formData.installments,
                paymentMethodId: detectedPaymentMethod, // ✅ Usar método detectado
                identificationType: formData.identificationType,
                identificationNumber: formData.identificationNumber
            });

            console.log('✅ Pago procesado:', paymentResponse);

            // 3️⃣ Manejar respuesta según el estado
            if (paymentResponse.status === 'approved') {
                console.info(`🎉 ¡Pago Exitoso! , la membresia ${membershipPlan.name} a sido activada`)
                onPaymentSuccess(paymentResponse);
            } else if (paymentResponse.status === 'pending') {
                onPaymentSuccess(paymentResponse);
            } else {
                throw new Error(`Pago ${paymentResponse.status}: ${paymentResponse.statusDetail}`);
            }

        } catch (error: any) {
            console.error('❌ Error procesando pago:', error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    // ... resto del JSX igual pero agregando esta línea en el resumen:
    return (
        <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left side: Form */}
            <div className="w-full">
                <form onSubmit={handleSubmit}>
                    {/* ... todo el formulario igual ... */}
                    <FieldGroup>
                        <FieldSet>
                            <FieldLegend>Método de pago</FieldLegend>
                            <FieldDescription>
                                Todas las transacciones seguras y encriptadas
                            </FieldDescription>
                            <FieldGroup>
                                <Field>
                                    <FieldLabel htmlFor="checkout-7j9-card-name-43j">
                                        Nombre en la tarjeta
                                    </FieldLabel>
                                    <Input
                                        id="checkout-7j9-card-name-43j"
                                        placeholder="Juan Perez"
                                        value={formData.cardholderName}
                                        onChange={(e) => handleInputChange('cardholderName', e.target.value)}
                                        required
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="checkout-7j9-card-number-uw1">
                                        Número de tarjeta
                                    </FieldLabel>
                                    <Input
                                        id="checkout-7j9-card-number-uw1"
                                        placeholder="4009 1753 3280 6176"
                                        value={formatCardNumber(formData.cardNumber)}
                                        onChange={(e) => handleCardNumberChange(e.target.value)}
                                        required
                                    />
                                    <FieldDescription>
                                        Método detectado: <strong>{detectedPaymentMethod}</strong>
                                    </FieldDescription>
                                </Field>
                                <div className="grid grid-cols-3 gap-4">
                                    <Field>
                                        <FieldLabel htmlFor="checkout-exp-month-ts6">
                                            Mes
                                        </FieldLabel>
                                        <Select value={formData.expirationMonth} onValueChange={(value) => handleInputChange('expirationMonth', value)}>
                                            <SelectTrigger id="checkout-exp-month-ts6">
                                                <SelectValue placeholder="MM" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="01">01</SelectItem>
                                                <SelectItem value="02">02</SelectItem>
                                                <SelectItem value="03">03</SelectItem>
                                                <SelectItem value="04">04</SelectItem>
                                                <SelectItem value="05">05</SelectItem>
                                                <SelectItem value="06">06</SelectItem>
                                                <SelectItem value="07">07</SelectItem>
                                                <SelectItem value="08">08</SelectItem>
                                                <SelectItem value="09">09</SelectItem>
                                                <SelectItem value="10">10</SelectItem>
                                                <SelectItem value="11">11</SelectItem>
                                                <SelectItem value="12">12</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="checkout-7j9-exp-year-f59">
                                            Año
                                        </FieldLabel>
                                        <Select value={formData.expirationYear} onValueChange={(value) => handleInputChange('expirationYear', value)}>
                                            <SelectTrigger id="checkout-7j9-exp-year-f59">
                                                <SelectValue placeholder="YYYY" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="2024">2024</SelectItem>
                                                <SelectItem value="2025">2025</SelectItem>
                                                <SelectItem value="2026">2026</SelectItem>
                                                <SelectItem value="2027">2027</SelectItem>
                                                <SelectItem value="2028">2028</SelectItem>
                                                <SelectItem value="2029">2029</SelectItem>
                                                <SelectItem value="2030">2030</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="checkout-7j9-cvv">CVV</FieldLabel>
                                        <Input
                                            id="checkout-7j9-cvv"
                                            placeholder="123"
                                            value={formData.securityCode}
                                            onChange={(e) => handleInputChange('securityCode', e.target.value)}
                                            required
                                        />
                                    </Field>
                                </div>
                                <Field>
                                    <FieldLabel htmlFor="identification-type">
                                        Tipo de identificación
                                    </FieldLabel>
                                    <Select value={formData.identificationType} onValueChange={(value) => handleInputChange('identificationType', value)}>
                                        <SelectTrigger id="identification-type">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="DNI">DNI</SelectItem>
                                            <SelectItem value="RUC">RUC</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="identification-number">
                                        Número de identificación
                                    </FieldLabel>
                                    <Input
                                        id="identification-number"
                                        placeholder="12345678"
                                        value={formData.identificationNumber}
                                        onChange={(e) => handleInputChange('identificationNumber', e.target.value)}
                                        required
                                    />
                                </Field>
                            </FieldGroup>
                        </FieldSet>
                        <FieldSet>
                            <FieldGroup>
                                <Field>
                                    <FieldLabel htmlFor="checkout-7j9-optional-comments">
                                        Comentarios
                                    </FieldLabel>
                                    <Textarea
                                        id="checkout-7j9-optional-comments"
                                        placeholder="Agrega cualquier comentario adicional"
                                        className="resize-none"
                                        value={formData.comments}
                                        onChange={(e) => handleInputChange('comments', e.target.value)}
                                    />
                                </Field>
                            </FieldGroup>
                        </FieldSet>
                        <Field orientation="horizontal">
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isProcessing}
                            >
                                {isProcessing ? '🔄 Procesando pago...' : `💳 Pagar S/. ${membershipPlan.price}`}
                            </Button>
                            <Button variant="outline" type="button">
                                Cancelar
                            </Button>
                        </Field>
                    </FieldGroup>
                </form>
            </div>

            {/* Right side: Data display */}
            <div className="w-full">
                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Resumen de datos</h3>
                    <div className="space-y-2">
                        <p><strong>Nombre en la tarjeta:</strong> {formData.cardholderName || 'No especificado'}</p>
                        <p><strong>Número de tarjeta:</strong> {formatCardNumber(formData.cardNumber) || 'No especificado'}</p>
                        <p><strong>Fecha de expiración:</strong> {formData.expirationMonth}/{formData.expirationYear || 'No especificada'}</p>
                        <p><strong>CVV:</strong> {formData.securityCode ? '***' : 'No especificado'}</p>
                        <p><strong>Tipo de identificación:</strong> {formData.identificationType}</p>
                        <p><strong>Número de identificación:</strong> {formData.identificationNumber || 'No especificado'}</p>
                        <p><strong>Método de pago:</strong> {detectedPaymentMethod}</p>
                        <p><strong>Comentarios:</strong> {formData.comments || 'Ninguno'}</p>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                        <p><strong>Plan de membresía:</strong> {membershipPlan.name}</p>
                        <p><strong>Precio:</strong> S/. {membershipPlan.price}</p>
                        <p><strong>Descripción:</strong> {membershipPlan.description}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
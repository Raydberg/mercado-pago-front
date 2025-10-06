import type { CardData } from "@/interface/card-data.interface";
import type { CreateTokenPaymentResponse } from "@/interface/create-token-payment.interface";
import axios from 'axios'

declare global {
    interface Window {
        MercadoPago: any;
    }
}

export class PaymentService {
    private static mp: any = null;
    private static publicKey: string = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY || '';
    private static backendUrl: string = import.meta.env.VITE_BACKEND_URL || 'http://localhost:9090/billing';

    static async initialize() {
        if (!this.mp) {
            await this.loadMercadoPagoScript();
            this.mp = new window.MercadoPago(this.publicKey, {
                locale: "es-PE"
            });
        }
        return this.mp;
    }

    private static loadMercadoPagoScript(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (window.MercadoPago) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://sdk.mercadopago.com/js/v2';
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Error cargando SDK de Mercado Pago'));
            document.body.appendChild(script);
        });
    }

    /**
     * Crear token de tarjeta usando la API correcta de MP
     */
    static async createCardToken(cardData: CardData): Promise<CreateTokenPaymentResponse> {
        await this.initialize();
        
        try {
            // ✅ API correcta para crear tokens sin montar campos
            const cardToken = await this.mp.createCardToken({
                cardNumber: cardData.cardNumber,
                cardholderName: cardData.cardholderName,
                cardExpirationMonth: cardData.cardExpirationMonth,
                cardExpirationYear: cardData.cardExpirationYear,
                securityCode: cardData.securityCode,
                identificationType: cardData.identificationType,
                identificationNumber: cardData.identificationNumber
            });

            console.log('✅ Token creado exitosamente:', cardToken.id);
            return cardToken;
            
        } catch (error: any) {
            console.error('❌ Error detallado creando token:', error);
            
            // Manejo específico de errores de MP
            if (error.message?.includes('primary field')) {
                throw new Error('Error de configuración del SDK. Intenta de nuevo.');
            }
            
            if (error.cause?.length > 0) {
                const firstError = error.cause[0];
                throw new Error(`Error en ${firstError.field}: ${firstError.message}`);
            }
            
            throw new Error(error.message || 'Error al procesar la tarjeta');
        }
    }

    /**
     * Detectar método de pago por BIN
     */
    static async detectPaymentMethod(bin: string): Promise<string> {
        try {
            await this.initialize();
            const paymentMethods = await this.mp.getPaymentMethods({ bin });
            
            if (paymentMethods.results && paymentMethods.results.length > 0) {
                return paymentMethods.results[0].id;
            }
            
            return 'visa'; // fallback
        } catch (error) {
            console.warn('Error detectando método de pago:', error);
            return 'visa'; // fallback
        }
    }

    /**
     * Procesar pago directo (enviar al backend)
     */
    static async processDirectPayment(paymentData: any) {
        try {
            const response = await axios.post(`${this.backendUrl}/payments/process`, paymentData, {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 30000 // 30 segundos timeout
            });
            return response.data;
        } catch (error: any) {
            console.error('Error procesando pago:', error);
            
            if (error.response?.data?.message) {
                throw new Error(error.response.data.message);
            }
            
            if (error.code === 'ECONNABORTED') {
                throw new Error('Timeout: El pago está tardando más de lo esperado');
            }
            
            throw new Error('Error de conexión con el servidor');
        }
    }

    /**
     * Obtener estado del pago
     */
    static async getPaymentStatus(externalReference: string) {
        try {
            const response = await axios.get(`${this.backendUrl}/payments/status/${externalReference}`);
            return response.data;
        } catch (error: any) {
            console.error('Error consultando estado:', error);
            throw new Error(error.response?.data?.message || 'Error al consultar estado del pago');
        }
    }

    /**
     * Obtener métodos de pago disponibles
     */
    static async getPaymentMethods() {
        try {
            await this.initialize();
            return await this.mp.getPaymentMethods();
        } catch (error) {
            console.error('Error obteniendo métodos de pago:', error);
            return { results: [] };
        }
    }

    static async getCardInfo(bin: string) {
        try {
            await this.initialize();
            return await this.mp.getPaymentMethods({ bin });
        } catch (error) {
            console.error('Error obteniendo info de tarjeta:', error);
            return { results: [] };
        }
    }
}
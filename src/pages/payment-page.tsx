import { PaymentForm } from "@/components/payment-form"

export const PaymentPage = () => {
    const mockMembershipPlan = {
        id: "1",
        name: "Plan Básico",
        price: 50,
        description: "Acceso básico al gimnasio"
    };
    // ✅ Usuario oficial correcto
    const mockUserId = "12"; 
    // 🔥 USA UN EMAIL DE PRUEBA ESTÁNDAR - CUALQUIER EMAIL VÁLIDO FUNCIONA
    const mockUserEmail = "raydev@gmail.com";

    const handlePaymentSuccess = (paymentData: any) => {
        console.log("Pago exitoso:", paymentData);
        // Aquí puedes manejar el éxito del pago, como redirigir o mostrar un mensaje
    };

    return (
        <PaymentForm
            membershipPlan={mockMembershipPlan}
            userId={mockUserId}
            userEmail={mockUserEmail}
            onPaymentSuccess={handlePaymentSuccess}
        />
    )
}
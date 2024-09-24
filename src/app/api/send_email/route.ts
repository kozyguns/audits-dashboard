import { NextResponse } from "next/server";
import { Resend } from "resend";
import TimeOffApproved from "../../../../emails/TimeOffApproved";
import TimeOffRequest from "../../../../emails/TimeOffRequest";
import TimeOffDenied from "../../../../emails/TimeOffDenied";
import CalledOut from "../../../../emails/CalledOut";
import LeftEarly from "../../../../emails/LeftEarly";
import CustomStatus from "../../../../emails/CustomStatus";
import GunsmithInspection from "../../../../emails/GunsmithInspection";
import OrderCustomerContacted from "../../../../emails/OrderCustomerContacted";
import OrderSetStatus from "../../../../emails/OrderSetStatus";
import SuggestionReply from "../../../../emails/SuggestionReply";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const { email, subject, templateName, templateData } = await request.json();

  if (!email || !subject || !templateName) {
    return NextResponse.json(
      {
        error: "Missing required fields",
        details: { email, subject, templateName },
      },
      { status: 400 }
    );
  }

  try {
    let emailTemplate;
    let fromEmail;

    switch (templateName) {
      case "TimeOffApproved":
        emailTemplate = TimeOffApproved(templateData);
        fromEmail = `TGR <scheduling@${process.env.RESEND_DOMAIN}>`;
        break;
      case "TimeOffDenied":
        emailTemplate = TimeOffDenied(templateData);
        fromEmail = `TGR <scheduling@${process.env.RESEND_DOMAIN}>`;
        break;
      case "CalledOut":
        emailTemplate = CalledOut(templateData);
        fromEmail = `TGR <scheduling@${process.env.RESEND_DOMAIN}>`;
        break;
      case "LeftEarly":
        emailTemplate = LeftEarly(templateData);
        fromEmail = `TGR <scheduling@${process.env.RESEND_DOMAIN}>`;
        break;
      case "CustomStatus":
        emailTemplate = CustomStatus({
          name: templateData.name,
          date: templateData.date,
          status: templateData.status || templateData.customMessage,
        });
        fromEmail = `TGR <scheduling@${process.env.RESEND_DOMAIN}>`;
        break;
      case "GunsmithInspection":
        emailTemplate = GunsmithInspection({
          firearmId: templateData.firearmId,
          firearmName: templateData.firearmName,
          requestedBy: templateData.requestedBy,
          notes: templateData.notes,
        });
        fromEmail = `TGR <request@${process.env.RESEND_DOMAIN}>`;
        break;
      case "OrderCustomerContacted":
        emailTemplate = OrderCustomerContacted({
          id: templateData.id,
          customerName: templateData.customerName,
          contactedBy: templateData.contactedBy,
          item: templateData.item,
          details: templateData.details,
        });
        fromEmail = `TGR <orders@${process.env.RESEND_DOMAIN}>`;
        break;
      case "OrderSetStatus":
        emailTemplate = OrderSetStatus({
          id: templateData.id,
          customerName: templateData.customerName,
          newStatus: templateData.newStatus,
          updatedBy: templateData.updatedBy,
          item: templateData.item,
        });
        fromEmail = `TGR <orders@${process.env.RESEND_DOMAIN}>`;
        break;
      case "SuggestionReply":
        emailTemplate = SuggestionReply({
          employeeName: templateData.employeeName,
          originalSuggestion: templateData.originalSuggestion,
          replyText: templateData.replyText,
          repliedBy: templateData.repliedBy,
        });
        fromEmail = `TGR <suggestions@${process.env.RESEND_DOMAIN}>`;
        break;
      case "TimeOffRequest":
        emailTemplate = TimeOffRequest({
          employeeName: templateData.employeeName,
          startDate: templateData.startDate,
          endDate: templateData.endDate,
          reason: templateData.reason,
          other_reason: templateData.other_reason,
        });
        fromEmail = `TGR <scheduling@${process.env.RESEND_DOMAIN}>`;
        break;
      default:
        throw new Error("Invalid template name");
    }

    const resendRes = await resend.emails.send({
      from: fromEmail,
      to: Array.isArray(email) ? email : [email],
      subject: subject,
      react: emailTemplate,
    });

    if (resendRes.error) {
      throw new Error(resendRes.error.message);
    }

    return NextResponse.json({
      message: "Email sent successfully",
      data: resendRes,
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    },
  });
}
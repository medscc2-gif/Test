import SwiftUI

struct ReportView: View {
    let session: TrackingSession

    @Environment(\.dismiss) private var dismiss
    @State private var selectedFormat: ReportFormat = .text
    @State private var shareURL: URL?
    @State private var showingShareSheet = false

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                Picker("Format", selection: $selectedFormat) {
                    ForEach(ReportFormat.allCases) { format in
                        Text(format.title).tag(format)
                    }
                }
                .pickerStyle(.segmented)

                ScrollView {
                    Text(ReportService.generateTextReport(for: session))
                        .font(.caption.monospaced())
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding()
                        .background(Color(.secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                Button {
                    shareURL = ReportService.exportURL(for: session, format: selectedFormat)
                    showingShareSheet = shareURL != nil
                } label: {
                    Label("Share \(selectedFormat.title)", systemImage: "square.and.arrow.up")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
            }
            .padding()
            .navigationTitle("Trip Report")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
            .sheet(isPresented: $showingShareSheet) {
                if let shareURL {
                    ShareSheet(items: [shareURL])
                }
            }
        }
    }
}

private struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

#Preview {
    ReportView(session: TrackingSession(name: "Sample Trip"))
}

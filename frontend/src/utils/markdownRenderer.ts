// Utility function to detect and render markdown tables
export const renderMarkdownContent = (content: string): string => {
  // Split content into lines
  const lines = content.split('\n');
  let result = '';
  let inTable = false;
  let tableLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this line looks like a table header (contains | and has text)
    const isTableHeader = line.includes('|') && line.trim().length > 0 && 
                         !line.startsWith('#') && !line.startsWith('-');
    
    // Check if next line is table separator (contains | and -)
    const nextLine = lines[i + 1] || '';
    const isTableSeparator = nextLine.includes('|') && nextLine.includes('-') && 
                            nextLine.trim().replace(/[|\-\s]/g, '').length === 0;
    
    if (isTableHeader && isTableSeparator) {
      // Start of a table
      inTable = true;
      tableLines = [line];
      continue;
    }
    
    if (inTable) {
      if (line.includes('|') && line.trim().length > 0) {
        // Continue table
        tableLines.push(line);
      } else {
        // End of table
        result += renderTable(tableLines);
        inTable = false;
        tableLines = [];
        result += line + '\n';
      }
    } else {
      result += line + '\n';
    }
  }
  
  // Handle table at end of content
  if (inTable && tableLines.length > 0) {
    result += renderTable(tableLines);
  }
  
  return result;
};

const renderTable = (tableLines: string[]): string => {
  if (tableLines.length < 2) return tableLines.join('\n');
  
  // Parse table structure
  const rows = tableLines.map(line => 
    line.split('|')
      .map(cell => cell.trim())
      .filter(cell => cell.length > 0)
  );
  
  // Remove separator row (the one with dashes)
  const dataRows = rows.filter(row => 
    !row.every(cell => cell.replace(/[\-\s]/g, '').length === 0)
  );
  
  if (dataRows.length === 0) return tableLines.join('\n');
  
  // Generate HTML table
  let html = '<div class="overflow-x-auto my-4"><table class="min-w-full border border-gray-300 rounded-lg overflow-hidden">';
  
  // Add header
  if (dataRows.length > 0) {
    html += '<thead class="bg-gray-50"><tr>';
    dataRows[0].forEach(cell => {
      html += `<th class="px-4 py-3 text-left text-sm font-medium text-gray-900 border-b border-gray-300">${escapeHtml(cell)}</th>`;
    });
    html += '</tr></thead>';
  }
  
  // Add body
  html += '<tbody class="bg-white">';
  for (let i = 1; i < dataRows.length; i++) {
    html += '<tr class="hover:bg-gray-50">';
    dataRows[i].forEach(cell => {
      html += `<td class="px-4 py-3 text-sm text-gray-700 border-b border-gray-200">${escapeHtml(cell)}</td>`;
    });
    html += '</tr>';
  }
  html += '</tbody></table></div>';
  
  return html;
};

const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// Enhanced function to detect and format financial data
export const formatFinancialContent = (content: string): string => {
  // First render any markdown tables
  let formatted = renderMarkdownContent(content);
  
  // Then apply financial highlighting
  formatted = formatted
    // Highlight currency amounts
    .replace(/\$[\d,]+(?:\.\d{2})?/g, '<span class="font-semibold text-green-600">$&</span>')
    // Highlight percentages
    .replace(/[\d.]+%/g, '<span class="font-semibold text-blue-600">$&</span>')
    // Highlight share counts
    .replace(/[\d,]+ shares/g, '<span class="font-semibold text-purple-600">$&</span>')
    // Highlight years
    .replace(/\b(20\d{2})\b/g, '<span class="font-medium text-gray-800">$&</span>');
  
  return formatted;
}; 
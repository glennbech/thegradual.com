import jsPDF from 'jspdf';

/**
 * Generates a results-focused PDF export of workout data formatted for AI analysis
 * @param {Object} data - The workout data to export
 * @param {Array} data.sessions - All completed workout sessions
 * @param {Object} data.user - User information
 * @returns {void} - Downloads PDF file
 */
export function exportWorkoutDataToPDF(data) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const lineHeight = 6;
  let yPosition = margin;

  // Color palette
  const colors = {
    primary: [99, 102, 241],      // Indigo
    secondary: [107, 114, 128],   // Gray
    accent: [236, 72, 153],       // Pink
    success: [16, 185, 129],      // Emerald
    background: [249, 250, 251],  // Light gray
    text: [17, 24, 39]            // Dark gray
  };

  // Helper function to add new page if needed
  const checkPageBreak = (requiredSpace = 20) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Helper function to add text with wrapping
  const addText = (text, fontSize = 9, isBold = false, color = colors.text) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setTextColor(...color);

    const lines = doc.splitTextToSize(text, pageWidth - 2 * margin);
    lines.forEach(line => {
      checkPageBreak();
      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    });
  };

  // Helper function to add section header with enhanced styling
  const addSectionHeader = (title, isMainSection = false) => {
    checkPageBreak(isMainSection ? 20 : 15);
    yPosition += isMainSection ? 8 : 5;

    if (isMainSection) {
      // Main section: colored bar with larger text
      doc.setFillColor(...colors.primary);
      doc.rect(margin, yPosition - 6, pageWidth - 2 * margin, 12, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(title, margin + 5, yPosition);
      yPosition += 14;
    } else {
      // Subsection: light background
      doc.setFillColor(...colors.background);
      doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 9, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.primary);
      doc.text(title, margin + 5, yPosition);
      yPosition += 11;
    }

    doc.setTextColor(...colors.text);
  };

  // Helper to add a data row in two columns
  const addDataRow = (label, value, indent = 0) => {
    checkPageBreak();
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.secondary);
    doc.text(label, margin + indent, yPosition);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.text);
    doc.text(String(value), pageWidth - margin - 40, yPosition);
    yPosition += lineHeight;
  };

  // Helper to add a metric card
  const addMetricCard = (label, value, x, y, width = 35) => {
    doc.setFillColor(...colors.background);
    doc.roundedRect(x, y, width, 16, 2, 2, 'F');
    doc.setFillColor(...colors.primary);
    doc.roundedRect(x, y, width, 3, 2, 2, 'F');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.secondary);
    doc.text(label, x + width / 2, y + 7, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.text);
    doc.text(String(value), x + width / 2, y + 13, { align: 'center' });
  };

  // ========================================
  // TITLE PAGE
  // ========================================
  yPosition = 40;
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pageWidth, 60, 'F');

  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Workout Performance Report', pageWidth / 2, 30, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, pageWidth / 2, 42, { align: 'center' });

  if (data.user?.email) {
    doc.text(data.user.email, pageWidth / 2, 50, { align: 'center' });
  }

  yPosition = 75;
  doc.setTextColor(...colors.text);

  // ========================================
  // EXECUTIVE SUMMARY
  // ========================================
  if (data.sessions && data.sessions.length > 0) {
    addSectionHeader('Executive Summary', true);

    // Calculate overall statistics
    const totalSets = data.sessions.reduce((sum, session) => {
      return sum + (session.exercises?.reduce((exerciseSum, ex) => {
        return exerciseSum + (ex.sets?.filter(s => s.completed).length || 0);
      }, 0) || 0);
    }, 0);

    const totalReps = data.sessions.reduce((sum, session) => {
      return sum + (session.exercises?.reduce((exerciseSum, ex) => {
        return exerciseSum + (ex.sets?.filter(s => s.completed).reduce((setSum, set) => setSum + (set.reps || 0), 0) || 0);
      }, 0) || 0);
    }, 0);

    const totalVolume = data.sessions.reduce((sum, session) => {
      return sum + (session.exercises?.reduce((exerciseSum, ex) => {
        return exerciseSum + (ex.sets?.filter(s => s.completed).reduce((setSum, set) => {
          return setSum + ((set.reps || 0) * (set.weight || 0));
        }, 0) || 0);
      }, 0) || 0);
    }, 0);

    // Get date range
    const sortedSessions = [...data.sessions].sort((a, b) =>
      new Date(a.completedAt || a.createdAt) - new Date(b.completedAt || b.createdAt)
    );
    const firstDate = new Date(sortedSessions[0].completedAt || sortedSessions[0].createdAt);
    const lastDate = new Date(sortedSessions[sortedSessions.length - 1].completedAt || sortedSessions[sortedSessions.length - 1].createdAt);
    const daysBetween = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)) + 1;

    // Draw metric cards
    const cardY = yPosition;
    const cardWidth = 35;
    const cardSpacing = 3;
    const startX = margin + 5;

    addMetricCard('Sessions', data.sessions.length, startX, cardY, cardWidth);
    addMetricCard('Total Sets', totalSets, startX + cardWidth + cardSpacing, cardY, cardWidth);
    addMetricCard('Total Reps', totalReps.toLocaleString(), startX + (cardWidth + cardSpacing) * 2, cardY, cardWidth);
    addMetricCard('Total Volume', `${(totalVolume / 1000).toFixed(1)}t`, startX + (cardWidth + cardSpacing) * 3, cardY, cardWidth);

    yPosition += 25;

    // Training period
    addText(`Training Period: ${firstDate.toLocaleDateString()} - ${lastDate.toLocaleDateString()} (${daysBetween} days)`, 9, false, colors.secondary);
    addText(`Average Volume per Session: ${(totalVolume / data.sessions.length / 1000).toFixed(1)} tonnes`, 9, false, colors.secondary);
    yPosition += 8;
  }

  // ========================================
  // WORKOUT SESSION HISTORY
  // ========================================
  if (data.sessions && data.sessions.length > 0) {
    addSectionHeader('Workout Session History', true);

    // Sort sessions by date (most recent first)
    const sortedSessions = [...data.sessions].sort((a, b) =>
      new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt)
    );

    sortedSessions.forEach((session, index) => {
      checkPageBreak(35);

      // Session header with colored background
      const sessionDate = new Date(session.completedAt || session.createdAt);
      const sessionName = session.templateReference?.templateName || `Workout ${sortedSessions.length - index}`;

      doc.setFillColor(...colors.background);
      doc.roundedRect(margin, yPosition - 2, pageWidth - 2 * margin, 10, 1, 1, 'F');

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.text);
      doc.text(sessionName, margin + 3, yPosition + 4);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...colors.secondary);
      doc.text(sessionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), pageWidth - margin - 3, yPosition + 4, { align: 'right' });

      yPosition += 13;

      // Session stats
      const sessionSets = session.exercises?.reduce((sum, ex) =>
        sum + (ex.sets?.filter(s => s.completed).length || 0), 0) || 0;
      const sessionReps = session.exercises?.reduce((sum, ex) =>
        sum + (ex.sets?.filter(s => s.completed).reduce((setSum, set) => setSum + (set.reps || 0), 0) || 0), 0) || 0;
      const sessionVolume = session.exercises?.reduce((sum, ex) =>
        sum + (ex.sets?.filter(s => s.completed).reduce((setSum, set) =>
          setSum + ((set.reps || 0) * (set.weight || 0)), 0) || 0), 0) || 0;

      doc.setFontSize(8);
      doc.setTextColor(...colors.secondary);
      const statsText = `${session.exercises?.length || 0} exercises  •  ${sessionSets} sets  •  ${sessionReps} reps  •  ${(sessionVolume / 1000).toFixed(2)}t volume`;
      if (session.duration) {
        doc.text(`${statsText}  •  ${Math.round(session.duration / 60)} min`, margin + 3, yPosition);
      } else {
        doc.text(statsText, margin + 3, yPosition);
      }
      yPosition += 8;

      // Exercises in session (only show exercises with completed sets)
      if (session.exercises && session.exercises.length > 0) {
        session.exercises.forEach((exercise) => {
          // Skip exercises with no completed sets
          const completedSets = exercise.sets?.filter(s => s.completed) || [];
          if (completedSets.length === 0) {
            return;
          }

          checkPageBreak(12);

          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...colors.text);
          doc.text(exercise.name, margin + 6, yPosition);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(...colors.secondary);
          if (exercise.category) {
            doc.text(exercise.category, margin + 6, yPosition + 5);
          }

          // Exercise sets on the right
          // Determine exercise type
          const hasWeight = completedSets.some(set => set.weight && set.weight > 0);
          const hasTime = completedSets.some(set => set.time && set.time > 0);

          const setsText = completedSets.map((set) => {
            if (hasTime && set.time) {
              // Time-based exercise (e.g., Plank, Cardio)
              const minutes = Math.floor(set.time / 60);
              const seconds = set.time % 60;
              if (minutes > 0) {
                return `${minutes}:${seconds.toString().padStart(2, '0')}`;
              } else {
                return `${seconds}s`;
              }
            } else if (hasWeight && set.weight) {
              // Weighted exercise
              return `${set.reps}×${set.weight}kg`;
            } else if (set.reps) {
              // Bodyweight reps
              return `${set.reps} reps`;
            } else {
              return '';
            }
          }).filter(s => s).join('  ');

          doc.setTextColor(...colors.text);
          doc.text(setsText, pageWidth - margin - 3, yPosition, { align: 'right' });

          // Summary line below
          if (hasTime) {
            // For time-based exercises, show total time
            const totalSeconds = completedSets.reduce((sum, set) => sum + (set.time || 0), 0);
            const totalMinutes = Math.floor(totalSeconds / 60);
            const remainingSeconds = totalSeconds % 60;
            let timeText;
            if (totalMinutes > 0) {
              timeText = `${totalMinutes}:${remainingSeconds.toString().padStart(2, '0')} total`;
            } else {
              timeText = `${remainingSeconds}s total`;
            }
            doc.setTextColor(...colors.secondary);
            doc.text(timeText, pageWidth - margin - 3, yPosition + 5, { align: 'right' });
          } else if (hasWeight) {
            // Volume for weighted exercises
            const exerciseVolume = completedSets.reduce((sum, set) =>
              sum + ((set.reps || 0) * (set.weight || 0)), 0);
            doc.setTextColor(...colors.secondary);
            doc.text(`${(exerciseVolume / 1000).toFixed(2)}t`, pageWidth - margin - 3, yPosition + 5, { align: 'right' });
          } else {
            // For bodyweight exercises, show total reps
            const totalReps = completedSets.reduce((sum, set) => sum + (set.reps || 0), 0);
            doc.setTextColor(...colors.secondary);
            doc.text(`${totalReps} total reps`, pageWidth - margin - 3, yPosition + 5, { align: 'right' });
          }

          yPosition += 10;
        });
      }

      // Add separator line
      doc.setDrawColor(...colors.background);
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;
    });
  }

  // ========================================
  // AI ANALYSIS GUIDE
  // ========================================
  doc.addPage();
  yPosition = margin;

  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('AI Analysis Guide', pageWidth / 2, 25, { align: 'center' });

  yPosition = 55;
  doc.setTextColor(...colors.text);

  addSectionHeader('How to Analyze This Data', true);

  addText('This report contains structured workout performance data optimized for AI analysis. Use it to:', 9, false, colors.text);
  yPosition += 4;

  const analysisAreas = [
    { title: 'Progress Tracking', desc: 'Identify strength gains and performance trends over time' },
    { title: 'Volume Analysis', desc: 'Evaluate training load patterns and recovery adequacy' },
    { title: 'Exercise Performance', desc: 'Compare performance across different exercises and muscle groups' },
    { title: 'Consistency', desc: 'Assess workout frequency and adherence patterns' },
    { title: 'Personal Records', desc: 'Identify peak performances and milestone achievements' },
    { title: 'Training Balance', desc: 'Analyze muscle group distribution and training splits' },
    { title: 'Recommendations', desc: 'Generate form tips and programming suggestions based on data patterns' }
  ];

  analysisAreas.forEach((area) => {
    checkPageBreak(12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.primary);
    doc.text(`• ${area.title}`, margin + 5, yPosition);
    yPosition += 5;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.secondary);
    doc.text(area.desc, margin + 10, yPosition);
    yPosition += 7;
  });

  yPosition += 5;
  addSectionHeader('Data Format Notes', false);
  yPosition += 2;

  const formatNotes = [
    'Sessions are sorted chronologically (most recent first)',
    'All weights are in kilograms (kg)',
    'Volume = reps × weight for each set',
    'Totals include only completed sets',
    'Dates use local timezone'
  ];

  formatNotes.forEach(note => {
    checkPageBreak();
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.secondary);
    doc.text(`• ${note}`, margin + 5, yPosition);
    yPosition += 5;
  });

  // Footer
  yPosition = pageHeight - margin - 10;
  doc.setFontSize(7);
  doc.setTextColor(...colors.secondary);
  doc.text('Generated by TheGradual - Progressive Overload Tracking', pageWidth / 2, yPosition, { align: 'center' });
  doc.text('https://thegradual.com', pageWidth / 2, yPosition + 4, { align: 'center' });

  // Save the PDF
  const fileName = `thegradual-workout-data-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

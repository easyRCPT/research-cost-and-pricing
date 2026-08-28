from typing import Dict
from ..models import Project, Budget


def load_budget_data(budget: Budget) -> Dict:
    """
    Load budget data from the database.
    """
    project_info = build_project_info(budget.project)

    project_duration = {
        'start_year': project_info['start_year'],
        'start_month': project_info['project_info']['start_month'],
        'end_year': project_info['project_info']['end_year'],
        'end_month': project_info['project_info']['end_month'],
    }

    staff_lines = list(budget.staff_lines.all())
    staff_table = {
        'info_table': build_staff_info_table(staff_lines),
        'numeric_table': build_staff_numeric_table(staff_lines),
    }

    non_staff_lines = list(budget.non_staff_lines.all())
    non_staff_table = {
        'info_table': build_non_staff_info_table(non_staff_lines),
        'numeric_table': build_non_staff_numeric_table(non_staff_lines),
    }

    budget_info = build_budget_info(budget)

    return {
        'project_info': project_info,
        'project_duration': project_duration,
        'staff_table': staff_table,
        'non_staff_table': non_staff_table,
        'budget_info': budget_info,
    }


def build_project_info(project: Project) -> Dict:
    return {
        'title': project.title,
        'chief_investigator': project.chief_investigator,
        'funder': project.funder,
        'department': project.department.name,
        'faculty': project.department.faculty,
        'scheme': project.scheme,
        'start_year': project.start_year,
        'start_month': project.start_month,
        'end_year': project.end_year,
        'end_month': project.end_month,

        'company': project.COMPANY_CODE,
        'cost_centre': project.department.code,
        'activity': project.activity.name if project.activity else None,
        'region': project.region.name if project.region else None,
        'additional_information': project.additional_information,
    }


def build_staff_info_table(staff_lines) -> Dict:
    return {
        line.id: {
            'name_role': line.name_role,
            'employment_type': line.employment_type,
            'category': line.category,
            'classification': line.classification,
            'time_basis': line.time_basis,
            'in_kind': line.in_kind,
        }
        for line in staff_lines
    }


def build_staff_numeric_table(staff_lines) -> Dict:
    return {
        line.id: {
            allocation.year: allocation.time
            for allocation in line.allocations.all()
        }
        for line in staff_lines
    }


def build_non_staff_info_table(non_staff_lines) -> Dict:
    return {
        line.id: {
            'description': line.description,
            'in_kind': line.in_kind,
            'add_ten_percent': line.add_ten_percent,
            'indirect_rate_multiplier': line.indirect_rate_multiplier,
        }
        for line in non_staff_lines
    }


def build_non_staff_numeric_table(non_staff_lines) -> Dict:
    return {
        line.id: {
            amount.year: amount.amount
            for amount in line.amounts.all()
        }
        for line in non_staff_lines
    }


def build_budget_info(budget: Budget) -> Dict:
    return {
        'mode': budget.mode,
        'cost_multiplier': budget.cost_multiplier,
        'in_kind_multiplier': budget.in_kind_multiplier,
        'gst_applicable': budget.gst_applicable,
        'status': budget.status,
    }

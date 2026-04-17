"""Custom exceptions for DonorLink API"""


class DonorLinkException(Exception):
    """Base exception for DonorLink"""
    pass


class DonorNotFound(DonorLinkException):
    """Exception raised when a donor is not found"""
    pass


class InvalidDonor(DonorLinkException):
    """Exception raised for invalid donor data"""
    pass


class DonorNotEligible(DonorLinkException):
    """Exception raised when a donor is not eligible to donate"""
    pass


class DuplicateEmail(DonorLinkException):
    """Exception raised when trying to create a donor with duplicate email"""
    pass
